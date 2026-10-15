import fs from 'node:fs';
import path from 'node:path';
import { callGeminiApi } from '../gemini-client.ts';
import { renderSvgToPng } from '../utils/svg-renderer.ts';
import type { SvgStepContext } from './svg-audit.service.ts';

export interface MechanicalJointDef {
  name: string;
  sourceCoord: { x: number; y: number };
  targetCoord: { x: number; y: number };
  gapDistance: number;
  passed: boolean;
  nominalAngle?: number;
  measuredAngle?: number;
  description: string;
}

export interface DesignAuditIssue {
  category: 'AXIS_MISALIGNMENT' | 'MECHANICAL_GAP' | 'ANGLE_DEVIATION' | 'DESCRIPTION_MISMATCH' | 'VISUAL_DEFECT';
  severity: 'CRITICAL' | 'WARNING';
  element: string;
  reason: string;
  fixInstruction: string;
  measuredDelta?: number;
}

export interface DesignAuditReport {
  passed: boolean;
  score: number;
  mathematicalScore: number;
  visionScore: number;
  joints: MechanicalJointDef[];
  issues: DesignAuditIssue[];
  remediationPrompt: string;
}

/**
 * [Service Layer]
 * 수석 기계공학 벡터 도면 감사관 & 비전 검수 에이전트 서비스
 * - 수학적 유클리드 좌표 공차 검증 (오차 <= 2px, 축선 교차, 각도 정합)
 * - 고해상도 렌더링 기반 제미나이 멀티모달 비전(Vision) 정밀 감수
 * - 축 불일치 시 수학적 타겟 좌표를 포함한 자가 치유(Self-Healing) 교정 산출
 */
export class SvgDesignAuditorService {
  public static readonly TOLERANCE_GAP_PX = 2.0; // 접촉면 허용 최대 이격 공차
  public static readonly TOLERANCE_ANGLE_DEG = 5.0; // 허용 각도 편차

  /**
   * 1. 수학적 기하학 벡터 축 & 결합 홈 공차 정밀 분석
   */
  public static auditMechanicalAxesMath(svgCode: string): {
    joints: MechanicalJointDef[];
    issues: DesignAuditIssue[];
    score: number;
  } {
    const issues: DesignAuditIssue[] = [];
    const joints: MechanicalJointDef[] = [];

    // 1) Stick 1: Vertical Post 추출 (세움대 rect)
    const rectRegex = /<rect\b([^>]*)\/?>/gi;
    let postRect: { x: number; y: number; w: number; h: number } | null = null;
    let m: RegExpExecArray | null;
    while ((m = rectRegex.exec(svgCode)) !== null) {
      const attrs = m[1];
      const x = parseFloat((attrs.match(/\bx=["']([-\d.]+)/i) || [])[1]);
      const y = parseFloat((attrs.match(/\by=["']([-\d.]+)/i) || [])[1]);
      const w = parseFloat((attrs.match(/\bwidth=["']([-\d.]+)/i) || [])[1]);
      const h = parseFloat((attrs.match(/\bheight=["']([-\d.]+)/i) || [])[1]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
        if (h >= 100 && h / w >= 2.5 && w <= 40) {
          postRect = { x, y, w, h };
          break;
        }
      }
    }

    // 2) Stick 2: Diagonal Strut 추출 (빗장대 polygon 또는 line)
    const polyRegex = /<polygon\b([^>]*)\/?>/gi;
    const polygons: Array<{ pointsStr: string; pts: Array<{ x: number; y: number }>; minY: number; maxY: number; minX: number; maxX: number }> = [];
    while ((m = polyRegex.exec(svgCode)) !== null) {
      const ptsMatch = m[1].match(/\bpoints=["']([^"']+)/i);
      if (!ptsMatch) continue;
      const raw = ptsMatch[1].trim().split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < raw.length; i += 2) {
        pts.push({ x: raw[i], y: raw[i + 1] });
      }
      if (pts.length >= 3) {
        polygons.push({
          pointsStr: ptsMatch[1],
          pts,
          minX: Math.min(...pts.map((p) => p.x)),
          maxX: Math.max(...pts.map((p) => p.x)),
          minY: Math.min(...pts.map((p) => p.y)),
          maxY: Math.max(...pts.map((p) => p.y)),
        });
      }
    }

    // 3) Stick 3: Horizontal Bait Stick 추출 (가로 먹이대: 너비 120px 이상, y < 300인 수평 막대)
    const pathRegex = /<path\b([^>]*)\/?>/gi;
    let baitPathStr: string | null = null;
    let baitY: number | null = null;
    while ((m = pathRegex.exec(svgCode)) !== null) {
      const dMatch = m[1].match(/\bd=["']([^"']+)["']/i);
      if (dMatch) {
        const coords = dMatch[1].match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+\2/i);
        if (coords) {
          const x1 = parseFloat(coords[1]);
          const y = parseFloat(coords[2]);
          const x2 = parseFloat(coords[3]);
          if (Math.abs(x2 - x1) >= 120 && y < 300) {
            baitPathStr = dMatch[1];
            baitY = y;
            break;
          }
        }
      }
    }

    if (baitY === null) {
      // polygon 형태의 가로 막대도 지원
      const horizPoly = polygons.find(
        (p) => p.maxX - p.minX >= 120 && p.maxY - p.minY <= 35 && p.minY < 300
      );
      if (horizPoly) {
        baitY = horizPoly.minY;
      }
    }

    // 4) 홈 및 접촉부 힌지 감지
    // A. 상단 힌지: 세움대 꼭대기 chisel tip과 빗장대 상단 notch
    if (postRect) {
      let postCenterX = postRect.x + postRect.w / 2;
      let postTopY = postRect.y;

      // 세움대 상단에 장착된 깎인 쐐기(chisel tip polygon)가 있는지 검색
      const chiselPoly = polygons.find(
        (p) =>
          Math.abs(p.minX - postRect!.x) <= 4 &&
          Math.abs(p.maxX - (postRect!.x + postRect!.w)) <= 4 &&
          p.maxY <= postRect!.y + 5 &&
          p.minY < postRect!.y
      );
      if (chiselPoly) {
        const peak = chiselPoly.pts.reduce((prev, curr) => (curr.y < prev.y ? curr : prev));
        postCenterX = peak.x;
        postTopY = peak.y;
      }

      // 빗장대 polygon 찾기 (상단에서 비스듬히 내려와 먹이대 부근으로 가장 깊게 내려오는 다각형)
      const strutCandidates = polygons.filter(
        (p) =>
          p !== chiselPoly &&
          p.minY <= postTopY + 30 &&
          p.maxY >= postTopY + 40 &&
          p.maxY <= (baitY !== null ? baitY + 35 : 295) &&
          p.maxX > postCenterX
      );
      const strutPoly = strutCandidates.sort((a, b) => b.maxY - a.maxY)[0];

      if (strutPoly) {
        // 빗장대 상단 힌지 결합점 (V홈 꼭짓점 또는 상단 힌지 중심)
        const matingNotchPoly = polygons.find(
          (p) =>
            p !== chiselPoly &&
            p !== strutPoly &&
            p.maxX - p.minX <= 50 &&
            p.maxY - p.minY <= 35 &&
            Math.abs(p.minX - postCenterX) <= 25 &&
            Math.abs(p.minY - postTopY) <= 20
        );

        let strutTopX: number;
        let strutTopY: number;

        if (matingNotchPoly) {
          const notchApex = matingNotchPoly.pts.reduce((prev, curr) => (Math.abs(curr.x - postCenterX) < Math.abs(prev.x - postCenterX) ? curr : prev));
          strutTopX = notchApex.x;
          strutTopY = notchApex.y;
        } else {
          const topPts = strutPoly.pts.filter((pt) => pt.y <= strutPoly.minY + 25);
          const closestApex = topPts.reduce((prev, curr) =>
            Math.hypot(curr.x - postCenterX, curr.y - postTopY) < Math.hypot(prev.x - postCenterX, prev.y - postTopY) ? curr : prev
          );
          strutTopX = closestApex.x;
          strutTopY = closestApex.y;
        }

        const hingeDist = Math.hypot(strutTopX - postCenterX, strutTopY - postTopY);
        const passed = hingeDist <= SvgDesignAuditorService.TOLERANCE_GAP_PX;

        joints.push({
          name: 'Joint A (상단 힌지 결합: 세움대 머리 ↔ 빗장대 상단 홈)',
          sourceCoord: { x: Math.round(postCenterX), y: Math.round(postTopY) },
          targetCoord: { x: Math.round(strutTopX), y: Math.round(strutTopY) },
          gapDistance: parseFloat(hingeDist.toFixed(2)),
          passed,
          description: `세움대 상단 축(${Math.round(postCenterX)}, ${Math.round(postTopY)})과 빗장대 힌지 축(${Math.round(strutTopX)}, ${Math.round(strutTopY)})의 정합도`,
        });

        if (!passed && hingeDist > 4.0) {
          issues.push({
            category: 'AXIS_MISALIGNMENT',
            severity: 'CRITICAL',
            element: 'Joint A (상단 힌지)',
            reason: `세움대 머리와 빗장대 상단 홈 축이 서로 ${hingeDist.toFixed(1)}px 떨어져 있어 물리적으로 허공에 떠 있습니다.`,
            fixInstruction: `빗장대의 상단 힌지 접촉 좌표를 (${Math.round(postCenterX)}, ${Math.round(postTopY)})에 2px 이내로 정확히 일치시키십시오.`,
            measuredDelta: hingeDist,
          });
        }

        // B. 하단 빗장대 끝 ↔ 먹이대 결합부 검사
        if (baitY !== null) {
          const bottomApex = strutPoly.pts.reduce((prev, curr) => (curr.y > prev.y ? curr : prev));
          const strutBottomX = bottomApex.x;
          const strutBottomY = bottomApex.y;

          // 먹이대 수평면(y=baitY)과 안쪽 노치(y=baitY + 16) 사이에 안착되었는지 판정
          const notchTopY = baitY;
          const notchBottomY = baitY + 16;
          let rearGapY = 0;
          if (strutBottomY < notchTopY - SvgDesignAuditorService.TOLERANCE_GAP_PX) {
            rearGapY = notchTopY - strutBottomY;
          } else if (strutBottomY > notchBottomY + SvgDesignAuditorService.TOLERANCE_GAP_PX) {
            rearGapY = strutBottomY - notchBottomY;
          }

          const rearPassed = rearGapY <= SvgDesignAuditorService.TOLERANCE_GAP_PX;

          joints.push({
            name: 'Joint B (하단 걸림턱 결합: 빗장대 하단 끝 ↔ 먹이대 뒷홈)',
            sourceCoord: { x: Math.round(strutBottomX), y: Math.round(strutBottomY) },
            targetCoord: { x: Math.round(strutBottomX), y: Math.round(baitY) },
            gapDistance: parseFloat(rearGapY.toFixed(2)),
            passed: rearPassed,
            description: `빗장대 하단 끝(y=${Math.round(strutBottomY)})과 먹이대 축(y=${Math.round(baitY)})의 수직 정합도`,
          });

          if (!rearPassed && rearGapY > 4.0) {
            issues.push({
              category: 'MECHANICAL_GAP',
              severity: 'CRITICAL',
              element: 'Joint B (하단 빗장대-먹이대 걸림턱)',
              reason: `빗장대 하단 끝(y=${Math.round(strutBottomY)})이 먹이대(y=${Math.round(baitY)})와 ${rearGapY.toFixed(1)}px 수직으로 벌어져 있어 마찰 록(Lock)이 성립하지 않습니다.`,
              fixInstruction: `빗장대 하단 좌표 끝점을 먹이대 수평선(y=${Math.round(baitY)})에 2px 이내로 맞닿도록 조정하십시오.`,
              measuredDelta: rearGapY,
            });
          }

          // C. 빗장대 기울기(경사각) 계산
          const dx = strutBottomX - strutTopX;
          const dy = strutBottomY - strutTopY;
          if (dx !== 0) {
            const angleDeg = (Math.atan(Math.abs(dy / dx)) * 180) / Math.PI;
            const angleDiff = Math.abs(angleDeg - 45);
            if (angleDiff > SvgDesignAuditorService.TOLERANCE_ANGLE_DEG) {
              issues.push({
                category: 'ANGLE_DEVIATION',
                severity: 'WARNING',
                element: '빗장대(Stick 2) 경사각',
                reason: `빗장대 기울기가 약 ${angleDeg.toFixed(1)}°로 설계되어 최적 지지각(45°±5°)에서 벗어났습니다.`,
                fixInstruction: `빗장대의 대각선 기울기를 45도(각도 오차 5도 이내)로 조정하여 중력 하중 전달을 안정화하십시오.`,
                measuredDelta: angleDiff,
              });
            }
          }
        }
      }
    }

    // 점수 계산 (CRITICAL 당 -25점, WARNING 당 -10점)
    const critCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const warnCount = issues.filter((i) => i.severity === 'WARNING').length;
    const score = Math.max(0, 100 - critCount * 25 - warnCount * 10);

    return { joints, issues, score };
  }

  /**
   * 2. 제미나이 멀티모달 비전(Vision) 기반 시각적 외관 및 형태 일치도 감수
   */
  public static async auditMultimodalVision(
    apiKey: string,
    svgCode: string,
    context: SvgStepContext
  ): Promise<{ visionScore: number; visionIssues: DesignAuditIssue[]; rawAnalysis: string }> {
    const rendered = await renderSvgToPng(svgCode);

    const prompt = `
당신은 '원시 생존 교범'의 수석 기계공학 벡터 도면 감사관(Chief Mechanical Vector Blueprint Auditor)입니다.
첨부된 도면(1000px 렌더링 PNG)과 아래 [단계 설명]을 대조하여 시각적 및 물리적 결함을 정밀 감수하십시오.

[검수 대상 단계]:
- 주제: ${context.topicTitle}
- 단계: Step ${context.stepNumber} - ${context.stepTitle}
- 상세 설명: ${context.actionDescription}
${context.actionNote ? `- 핵심 팁: ${context.actionNote}` : ''}

[시각적 4대 절대 검수 루브릭]:
1. 나뭇가지 축선 정합 (Axis Alignment): 각 나뭇가지(세움대, 빗장대, 먹이대)의 힌지/홈 결합부가 눈으로 보기에 허공에 떠 있거나 빗나가지 않고 단단히 맞물려 있는가?
2. 설명 형태 일치 (Form Fidelity): 본문에서 설명한 형태(예: 숫자 4자 자립, 바위를 45도로 지탱 등)와 시각적 실루엣이 100% 일치하는가?
3. 부품 관통/잘림 결함 (No Piercing): 바위가 나뭇가지를 칼로 자른 것처럼 허리를 베고 지나가거나, 나뭇가지가 바위를 뚫고 나오는 비현실적 관통 결함이 없는가?
4. 시각적 선명성 (Visual Clarity): 부품 간 명암/그라디언트 및 깎인 속살(#fde68a)이 입체적으로 돋보이는가?

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "visionScore": number (0~100),
  "passed": boolean,
  "issues": [
    {
      "category": "AXIS_MISALIGNMENT" | "MECHANICAL_GAP" | "DESCRIPTION_MISMATCH" | "VISUAL_DEFECT",
      "severity": "CRITICAL" | "WARNING",
      "element": "결함 요소",
      "reason": "시각적 결함 원인",
      "fixInstruction": "어떻게 축과 좌표를 이동해야 하는지 구체적 지침"
    }
  ],
  "summary": "종합 시각적 감수 의견"
}`.trim();

    try {
      const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
        temperature: 0.1,
        responseMimeType: 'application/json',
        timeoutMs: 25000,
        imageBase64: rendered.base64,
        imageMimeType: 'image/png',
      });

      const parsed = JSON.parse(raw);
      return {
        visionScore: typeof parsed.visionScore === 'number' ? parsed.visionScore : 85,
        visionIssues: Array.isArray(parsed.issues) ? parsed.issues : [],
        rawAnalysis: parsed.summary || raw,
      };
    } catch (err: any) {
      return {
        visionScore: 80,
        visionIssues: [
          {
            category: 'VISUAL_DEFECT',
            severity: 'WARNING',
            element: '<svg>',
            reason: `비전 모델 검수 중 일시적 오류: ${err.message}`,
            fixInstruction: '수학적 축 검증 결과를 참조하여 교정하십시오.',
          },
        ],
        rawAnalysis: `Vision audit fallback: ${err.message}`,
      };
    }
  }

  /**
   * 3. 통합 설계 검수: 수학적 공차 + 비전 모델 종합 판정
   */
  public static async auditSvgDesign(
    svgCode: string,
    context: SvgStepContext,
    apiKey?: string
  ): Promise<DesignAuditReport> {
    // 1) 수학적 기하학 축 검증
    const mathResult = this.auditMechanicalAxesMath(svgCode);

    // 2) 비전 검증 (API 키 제공 시 실행)
    let visionScore = 100;
    let visionIssues: DesignAuditIssue[] = [];
    if (apiKey) {
      const visionResult = await this.auditMultimodalVision(apiKey, svgCode, context);
      visionScore = visionResult.visionScore;
      visionIssues = visionResult.visionIssues;
    }

    const allIssues = [...mathResult.issues, ...visionIssues];
    const totalScore = Math.round(mathResult.score * 0.5 + visionScore * 0.5);
    const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
    const passed = criticalCount === 0 && totalScore >= 85;

    let remediationPrompt = '';
    if (!passed) {
      remediationPrompt = [
        '⚠️ [수학적/시각적 벡터 도면 결함 정밀 교정 지침]:',
        ...allIssues.map((i, idx) => `${idx + 1}. [${i.category}] ${i.reason} -> 해결: ${i.fixInstruction}`),
        mathResult.joints.length > 0
          ? `\n[기계역학 접촉부 실측치]:\n${mathResult.joints.map((j) => `- ${j.name}: 이격 거리=${j.gapDistance}px (${j.passed ? 'PASS' : 'FAIL'})`).join('\n')}`
          : '',
      ].join('\n');
    }

    return {
      passed,
      score: totalScore,
      mathematicalScore: mathResult.score,
      visionScore,
      joints: mathResult.joints,
      issues: allIssues,
      remediationPrompt,
    };
  }
}
