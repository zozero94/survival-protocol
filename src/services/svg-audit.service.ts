import crypto from 'crypto';
import { callGeminiApi } from '../gemini-client.ts';

export type SvgAuditIssueCategory =
  | 'CONTENT_MISMATCH'
  | 'TEXT_OVERLAP'
  | 'BOUNDARY_CLIP'
  | 'TEXT_CORRUPTION'
  | 'STYLE_VIOLATION';

export interface SvgAuditIssue {
  category: SvgAuditIssueCategory;
  severity: 'CRITICAL' | 'WARNING';
  element: string;
  reason: string;
  fixInstruction: string;
}

export interface SvgAuditReport {
  passed: boolean;
  score: number;
  terminateLoop: boolean;
  issues: SvgAuditIssue[];
  remediationPrompt: string;
}

export interface SvgStepContext {
  topicTitle: string;
  stepNumber: string;
  stepTitle: string;
  actionDescription: string;
  actionNote?: string;
}

export type LoopTerminationReason =
  | 'PASSED'
  | 'AUTO_FIXED_PASSED'
  | 'MAX_ATTEMPTS_REACHED'
  | 'STAGNATION_DETECTED'
  | 'DUPLICATE_ISSUES_EARLY_EXIT'
  | 'AGENT_TERMINATE_SIGNAL'
  | 'CIRCUIT_BREAKER_TRIPPED';

export interface SvgVerificationLoopResult {
  svgCode: string;
  finalReport: SvgAuditReport;
  attemptsUsed: number;
  terminationReason: LoopTerminationReason;
  history: Array<{
    attempt: number;
    score: number;
    passed: boolean;
    issueCount: number;
  }>;
}

interface ParsedTextBox {
  rawTag: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  anchor: 'start' | 'middle' | 'end';
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const FORBIDDEN_TERMS = [
  '라이터', '성냥', '부탄가스', '버너', '비닐', '플라스틱',
  '알루미늄', '건전지', '나일론', '페트병', '타프',
  'lighter', 'plastic', 'battery', 'aluminum', 'nylon',
];

/**
 * [Service Layer]
 * 벡터(SVG) 도면 정밀 검수 에이전트 및 무한루프 방지 자가 치유(Self-Healing) 재추출 파이프라인
 * - 플로우: 벡터 추출 -> 정적 기하학/충돌 검수 + AI 에이전트 내용 검수 -> 문제 시 교정 프롬프트로 재추출 -> 재검수
 * - 무한 루프 원천 차단 5중 가드(5-Layer Anti-Infinite-Loop Safeguard) 내장
 */
export class SvgAuditService {
  /**
   * [Guard 1] 절대 초과 불가능한 하드캡 (누가 100이나 Infinity를 넣어도 최대 3회로 강제 제한)
   */
  public static readonly HARD_MAX_ATTEMPTS = 3;
  public static readonly PASS_SCORE_THRESHOLD = 85;

  /**
   * 검수 에이전트(svg-blueprint-auditor) 마스터 시스템 프롬프트
   */
  public static readonly AUDITOR_SYSTEM_PROMPT = `
당신은 '원시 생존 교범(SURVIVAL PROTOCOL)' 파이프라인의 수석 테크니컬 도면 감수관(SVG Blueprint QA Auditor)입니다.
입력으로 주어지는 [프로토콜 단계 본문(제목, 설명, 야전 핵심)]과 추출된 [SVG 벡터 도면 코드]를 정밀 대조하여 엄격하게 검수하십시오.

[핵심 검수 체크리스트]
1. 내용 및 물리 기하학 일치성 (Content & Geometry Match):
   - 본문의 핵심 메커니즘(절삭 방향, 적층 순서, 회전/하중 화살표 방향, 치수 비율, 부품 간 접촉 위치)이 SVG 도형 좌표(points, path d, line x1/y1-x2/y2)와 물리적으로 일치하는지 검증하십시오.
   - 방향이 반대이거나(예: 안쪽으로 열린 보우드릴 V홈, 거꾸로 된 유속 화살표), 본문에 없는 엉뚱한 도형이 그려진 경우 즉시 FAIL 처리하십시오.

2. 텍스트-도형 겹침 및 잘림 검사 (Anti-Collision & Clipping):
   - 모든 <text> 요소의 (x, y) 좌표, text-anchor, 글자 길이를 계산하여:
     a) 텍스트와 다른 텍스트가 겹치는지(TEXT_OVERLAP)
     b) 텍스트가 핵심 도형의 굵은 외곽선이나 화살표 선과 겹쳐 글자가 묻히는지(TEXT_OVERLAP)
     c) 텍스트나 도형이 viewBox 바깥으로 삐져나가 잘리는지(BOUNDARY_CLIP) 확인하십시오.

3. 문구 무결성 및 적절성 (Text & Label Integrity):
   - 깨진 글자(), 오탈자, 이중 이스케이프(&amp;amp;), 닫히지 않은 괄호가 없는지 확인하십시오.
   - 라벨 문구가 해당 단계의 핵심 부품·수치(mm, kg, °C, 각도 등)를 정확히 설명하는지, 현대 공산품 금지어가 섞이지 않았는지 검증하십시오.

[출력 형식 (JSON Only)]
{
  "passed": boolean,
  "score": number,
  "terminateLoop": boolean,
  "issues": [
    {
      "category": "CONTENT_MISMATCH" | "TEXT_OVERLAP" | "BOUNDARY_CLIP" | "TEXT_CORRUPTION" | "STYLE_VIOLATION",
      "severity": "CRITICAL" | "WARNING",
      "element": "문제가 된 SVG 요소 또는 텍스트",
      "reason": "구체적인 결함 원인과 좌표 근거",
      "fixInstruction": "재추출 시 어떻게 좌표를 이동하거나 도형 방향을 수정해야 하는지 구체적 지시"
    }
  ],
  "remediationPrompt": "Stitch edit_screens 또는 SVG 재생성기에 전달할 정밀 교정 프롬프트"
}`.trim();

  /**
   * 1차 정적 기하학, 텍스트 겹침(Collision), 경계 이탈(Clipping), 문구 깨짐 검수 (0.001초 결정론적 실행)
   */
  public static auditSvgStatic(svgCode: string, context?: SvgStepContext): SvgAuditReport {
    const issues: SvgAuditIssue[] = [];

    if (!svgCode || !/<svg[\s\S]*?<\/svg>/i.test(svgCode)) {
      return {
        passed: false,
        score: 0,
        terminateLoop: false,
        issues: [
          {
            category: 'STYLE_VIOLATION',
            severity: 'CRITICAL',
            element: '<svg>',
            reason: '유효한 <svg>...</svg> 루트 태그가 존재하지 않습니다.',
            fixInstruction: '완전한 <svg viewBox="0 0 680 340">...</svg> 벡터 코드를 반환하십시오.',
          },
        ],
        remediationPrompt: 'Return a valid, complete <svg viewBox="0 0 680 340">...</svg> element.',
      };
    }

    // 1. viewBox 파싱
    const vbMatch = svgCode.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    const vbWidth = vbMatch ? parseFloat(vbMatch[3]) : 680;
    const vbHeight = vbMatch ? parseFloat(vbMatch[4]) : 340;

    if (!vbMatch) {
      issues.push({
        category: 'STYLE_VIOLATION',
        severity: 'WARNING',
        element: '<svg>',
        reason: 'viewBox 속성이 누락되어 반응형 스케일링이 깨질 수 있습니다.',
        fixInstruction: 'viewBox="0 0 680 340" 속성을 <svg> 태그에 명시하십시오.',
      });
    }

    // 2. 최소 기하 도형 존재 여부 확인
    const shapeMatches = svgCode.match(/<(path|polygon|rect|circle|ellipse|line|polyline)\b/gi) || [];
    if (shapeMatches.length < 3) {
      issues.push({
        category: 'CONTENT_MISMATCH',
        severity: 'CRITICAL',
        element: '<svg>',
        reason: `도형 요소가 ${shapeMatches.length}개뿐이어서 기술 도면으로서의 구조가 결여되어 있습니다.`,
        fixInstruction: '단면도, 치수선, 화살표 벡터 등 최소 6개 이상의 정밀 기하 도형을 작도하십시오.',
      });
    }

    // 3. 모든 <text> 요소 추출 및 바운딩 박스/문구 검수
    const textBoxes = this.parseTextBoxes(svgCode);

    for (const tb of textBoxes) {
      // 3-a. 빈 텍스트 또는 깨진 문자 검사
      if (!tb.text.trim()) {
        issues.push({
          category: 'TEXT_CORRUPTION',
          severity: 'WARNING',
          element: tb.rawTag,
          reason: '내용이 비어 있는 <text> 태그가 존재합니다.',
          fixInstruction: '빈 <text> 태그를 제거하거나 명확한 부품 라벨을 입력하십시오.',
        });
        continue;
      }

      if (tb.text.includes('\uFFFD') || /&amp;amp;|undefined|\[object Object\]/i.test(tb.text)) {
        issues.push({
          category: 'TEXT_CORRUPTION',
          severity: 'CRITICAL',
          element: tb.text,
          reason: `문구 깨짐 또는 인코딩 오류('${tb.text}')가 감지되었습니다.`,
          fixInstruction: `깨진 텍스트 '${tb.text}'를 올바른 한글/영문 기술 용어로 교정하십시오.`,
        });
      }

      // 괄호 짝 맞는지 확인
      const openParens = (tb.text.match(/\(/g) || []).length;
      const closeParens = (tb.text.match(/\)/g) || []).length;
      const openBrackets = (tb.text.match(/\[/g) || []).length;
      const closeBrackets = (tb.text.match(/\]/g) || []).length;
      if (openParens !== closeParens || openBrackets !== closeBrackets) {
        issues.push({
          category: 'TEXT_CORRUPTION',
          severity: 'CRITICAL',
          element: tb.text,
          reason: `문구 내 괄호 짝이 맞지 않아 문구가 잘린 것으로 보입니다: "${tb.text}"`,
          fixInstruction: `텍스트 "${tb.text}"의 닫히지 않은 괄호를 완결하십시오.`,
        });
      }

      // 3-b. 현대 공산품 금지어 검사
      const lowerText = tb.text.toLowerCase();
      for (const term of FORBIDDEN_TERMS) {
        if (lowerText.includes(term.toLowerCase())) {
          issues.push({
            category: 'TEXT_CORRUPTION',
            severity: 'CRITICAL',
            element: tb.text,
            reason: `도면 라벨에 현대 공산품 금지어('${term}')가 포함되어 있습니다.`,
            fixInstruction: `'${term}'를 100% 원시 자연물 용어로 교체하십시오.`,
          });
        }
      }

      // 3-c. viewBox 경계 이탈(Clipping) 검사 (글자 폭을 반영한 left/right/top/bottom 전체 바운딩 박스 기준)
      if (tb.left < 2 || tb.right > vbWidth - 2 || tb.top < 1 || tb.bottom > vbHeight - 2) {
        issues.push({
          category: 'BOUNDARY_CLIP',
          severity: 'CRITICAL',
          element: tb.text,
          reason: `텍스트 "${tb.text}"의 바운딩 영역(left=${Math.round(tb.left)}, right=${Math.round(tb.right)}, y=${tb.y})이 viewBox(0 0 ${vbWidth} ${vbHeight}) 경계를 벗어났습니다.`,
          fixInstruction: `텍스트 "${tb.text}"의 x/y 좌표 또는 text-anchor를 조정하여 [10 ~ ${vbWidth - 10}] 범위 내에 완전히 수용하십시오.`,
        });
      }
    }

    // 4. 텍스트 간 겹침(Text-on-Text Overlap) 2D 바운딩 박스 교차 검사
    for (let i = 0; i < textBoxes.length; i++) {
      for (let j = i + 1; j < textBoxes.length; j++) {
        const a = textBoxes[i];
        const b = textBoxes[j];
        if (!a.text.trim() || !b.text.trim()) continue;

        const minFontSize = Math.min(a.fontSize, b.fontSize);
        const verticalDist = Math.abs(a.y - b.y);
        const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);

        // Y좌표 차이가 폰트 크기의 80% 미만이면서 X 구간이 8px 이상 겹치면 시각적 충돌!
        if (verticalDist < minFontSize * 0.8 && horizontalOverlap > 8) {
          issues.push({
            category: 'TEXT_OVERLAP',
            severity: 'CRITICAL',
            element: `"${a.text}" <-> "${b.text}"`,
            reason: `두 문구 "${a.text}"(x=${a.x}, y=${a.y})와 "${b.text}"(x=${b.x}, y=${b.y})가 서로 겹쳐 가독성이 훼손되었습니다.`,
            fixInstruction: `"${b.text}"의 y 좌표를 최소 ${Math.ceil(minFontSize * 1.4)}px 이상 아래로 내리거나 x 좌표를 분리하십시오.`,
          });
        }
      }
    }

    // 점수 산정 (CRITICAL 당 -25점, WARNING 당 -5점)
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const score = Math.max(0, 100 - criticalCount * 25 - warningCount * 5);
    const passed = criticalCount === 0 && score >= this.PASS_SCORE_THRESHOLD;

    const remediationPrompt = passed
      ? ''
      : this.buildRemediationPrompt(issues, context);

    return {
      passed,
      score,
      terminateLoop: false,
      issues,
      remediationPrompt,
    };
  }

  /**
   * 2차 에이전트(AI) 통합 검수: 정적 기하학 검수 + 스텝 본문과의 내용/물리적 고증 일치성 감사
   */
  public static async auditSvgWithAgent(
    apiKey: string | undefined,
    svgCode: string,
    context: SvgStepContext
  ): Promise<SvgAuditReport> {
    const staticReport = this.auditSvgStatic(svgCode, context);

    // API 키가 없거나 이미 정적 검사에서 치명적 구조 결함이 다수 발견된 경우 즉시 반환
    if (!apiKey || staticReport.score < 50) {
      return staticReport;
    }

    const userPrompt = `
[검수 대상 프로토콜 단계 정보]
- 전체 주제: ${context.topicTitle}
- 단계 번호: Step ${context.stepNumber}
- 단계 제목: ${context.stepTitle}
- 단계 본문 설명: ${context.actionDescription}
- 야전 핵심 노트: ${context.actionNote || '없음'}

[1차 정적 기하학 스캔 결과]
- 발견된 정적 이슈: ${staticReport.issues.length}건
${staticReport.issues.map((iss) => `  * [${iss.category}] ${iss.reason}`).join('\n')}

[검수할 SVG 벡터 코드]
${svgCode}

위 SVG 코드가 단계 본문의 물리적 원리·방향·부품 구조와 정확히 일치하는지, 문구와 도형이 겹치거나 깨지지 않았는지 검수하여 JSON으로 응답하십시오.
`.trim();

    try {
      const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', `${this.AUDITOR_SYSTEM_PROMPT}\n\n${userPrompt}`, {
        responseMimeType: 'application/json',
        temperature: 0.1,
        timeoutMs: 25000,
      });

      const parsed = JSON.parse(raw);
      const agentIssues: SvgAuditIssue[] = Array.isArray(parsed.issues) ? parsed.issues : [];

      // 정적 검수 이슈와 에이전트 시맨틱 이슈 병합 (중복 제거)
      const mergedIssues = [...staticReport.issues];
      for (const aIss of agentIssues) {
        const isDup = mergedIssues.some(
          (m) => m.category === aIss.category && m.element === aIss.element
        );
        if (!isDup && aIss.reason) {
          mergedIssues.push({
            category: aIss.category || 'CONTENT_MISMATCH',
            severity: aIss.severity === 'WARNING' ? 'WARNING' : 'CRITICAL',
            element: String(aIss.element || '<svg>'),
            reason: String(aIss.reason),
            fixInstruction: String(aIss.fixInstruction || ''),
          });
        }
      }

      const criticalCount = mergedIssues.filter((i) => i.severity === 'CRITICAL').length;
      const computedScore = typeof parsed.score === 'number'
        ? Math.min(staticReport.score, parsed.score)
        : Math.max(0, 100 - criticalCount * 25);

      const passed = criticalCount === 0 && Boolean(parsed.passed) && computedScore >= this.PASS_SCORE_THRESHOLD;

      return {
        passed,
        score: computedScore,
        terminateLoop: Boolean(parsed.terminateLoop),
        issues: mergedIssues,
        remediationPrompt: passed
          ? ''
          : (parsed.remediationPrompt || this.buildRemediationPrompt(mergedIssues, context)),
      };
    } catch (err) {
      // 에이전트 네트워크/API 지연 시 Circuit Breaker 작동 -> 정적 검수 결과로 안전 폴백
      return staticReport;
    }
  }

  /**
   * [Guard 4] 정적 기하학 결함(경계 이탈, 텍스트 겹침, 이중 엔티티) 결정론적 자동 교정기
   */
  public static autoFixStaticIssues(svgCode: string): string {
    if (!svgCode || !svgCode.includes('<svg')) return svgCode;

    let fixed = svgCode.replace(/&amp;amp;/g, '&amp;').replace(/\uFFFD/g, '');

    // viewBox 누락 시 기본 추가
    if (!/viewBox\s*=/i.test(fixed)) {
      fixed = fixed.replace(/<svg\b/i, '<svg viewBox="0 0 680 340"');
    }

    const vbMatch = fixed.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
    const vbWidth = vbMatch ? parseFloat(vbMatch[3]) : 680;
    const vbHeight = vbMatch ? parseFloat(vbMatch[4]) : 340;

    // 텍스트 좌표 클램핑(text-anchor 및 텍스트 폭 반영) 및 겹침 자동 이격
    const placedTextBoxes: Array<{ left: number; right: number; y: number; fontSize: number }> = [];

    fixed = fixed.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (fullMatch, attrs, innerText) => {
      const xMatch = attrs.match(/\bx\s*=\s*["']([-\d.]+)["']/i);
      const yMatch = attrs.match(/\by\s*=\s*["']([-\d.]+)["']/i);
      const fsMatch = attrs.match(/\bfont-size\s*=\s*["']([\d.]+)["']/i);
      const anchorMatch = attrs.match(/\btext-anchor\s*=\s*["'](start|middle|end)["']/i);

      if (!xMatch || !yMatch) return fullMatch;

      let x = parseFloat(xMatch[1]);
      let y = parseFloat(yMatch[1]);
      const fontSize = fsMatch ? parseFloat(fsMatch[1]) : 10;
      const anchor = (anchorMatch ? anchorMatch[1].toLowerCase() : 'start') as 'start' | 'middle' | 'end';

      const cleanText = innerText.replace(/<[^>]+>/g, '').trim();
      let estimatedWidth = 0;
      for (const ch of cleanText) {
        estimatedWidth += /[\u3131-\uD79D\u3040-\u30FF\u4E00-\u9FAF]/.test(ch)
          ? fontSize * 0.95
          : fontSize * 0.58;
      }

      // text-anchor를 고려하여 좌우 바운딩이 [6, vbWidth - 6] 안에 들어오도록 x 클램핑
      const margin = 6;
      if (anchor === 'start') {
        x = Math.max(margin, Math.min(vbWidth - margin - estimatedWidth, x));
      } else if (anchor === 'end') {
        x = Math.max(margin + estimatedWidth, Math.min(vbWidth - margin, x));
      } else {
        const half = estimatedWidth / 2;
        x = Math.max(margin + half, Math.min(vbWidth - margin - half, x));
      }

      y = Math.max(Math.ceil(fontSize), Math.min(vbHeight - 6, y));

      const getBounds = (cx: number) => {
        if (anchor === 'middle') return { left: cx - estimatedWidth / 2, right: cx + estimatedWidth / 2 };
        if (anchor === 'end') return { left: cx - estimatedWidth, right: cx };
        return { left: cx, right: cx + estimatedWidth };
      };

      let bounds = getBounds(x);

      // 이전 텍스트와 X, Y가 겹치면 안전 방향으로 Y를 이격 (하단 한계 도달 시 위쪽으로 이격)
      for (const prev of placedTextBoxes) {
        const hOverlap = Math.min(prev.right, bounds.right) - Math.max(prev.left, bounds.left);
        if (hOverlap > 8 && Math.abs(prev.y - y) < fontSize * 0.85) {
          const stepY = Math.ceil(fontSize * 1.35);
          if (prev.y + stepY <= vbHeight - 6) {
            y = prev.y + stepY;
          } else {
            y = Math.max(Math.ceil(fontSize), prev.y - stepY);
          }
        }
      }

      placedTextBoxes.push({ left: bounds.left, right: bounds.right, y, fontSize });

      const newAttrs = attrs
        .replace(/\bx\s*=\s*["'][-\d.]+["']/i, `x="${Math.round(x * 10) / 10}"`)
        .replace(/\by\s*=\s*["'][-\d.]+["']/i, `y="${Math.round(y * 10) / 10}"`);

      return `<text${newAttrs}>${innerText}</text>`;
    });

    return fixed;
  }

  /**
   * 🔄 [핵심 플로우] 벡터 추출 ➔ 에이전트 검수 ➔ (문제 시) 재추출 ➔ 재검수 루프
   * - 무한 루프 원천 차단 5중 안전장치 적용:
   *   1. HARD_MAX_ATTEMPTS(3회) 절대 상한 클램핑
   *   2. 동일 SVG 해시(Stagnation) 감지 시 즉시 조기 종료
   *   3. 동일 결함 시그니처 반복 시 즉시 조기 종료
   *   4. 최고 점수 도면(Best Candidate) 스냅샷 보존
   *   5. 예외 발생 시 Circuit Breaker 즉시 발동
   */
  public static async extractAndVerifyLoop(options: {
    context: SvgStepContext;
    extractFn: (attempt: number, remediationPrompt?: string) => Promise<string>;
    auditFn?: (svgCode: string, context: SvgStepContext) => Promise<SvgAuditReport>;
    apiKey?: string;
    maxAttempts?: number;
  }): Promise<SvgVerificationLoopResult> {
    // [Guard 1] maxAttempts 하드캡 강제 적용 (1 ~ 3 사이로 무조건 클램핑)
    const requestedMax = Number.isFinite(options.maxAttempts) ? Number(options.maxAttempts) : this.HARD_MAX_ATTEMPTS;
    const safeMaxAttempts = Math.min(Math.max(1, requestedMax), this.HARD_MAX_ATTEMPTS);

    const auditRunner = options.auditFn
      ? options.auditFn
      : (svg: string, ctx: SvgStepContext) => this.auditSvgWithAgent(options.apiKey, svg, ctx);

    const seenSvgHashes = new Set<string>();
    const seenIssueSignatures = new Set<string>();
    const history: SvgVerificationLoopResult['history'] = [];

    let bestCandidate: { svgCode: string; report: SvgAuditReport } | null = null;
    let lastRemediationPrompt: string | undefined = undefined;
    let terminationReason: LoopTerminationReason = 'MAX_ATTEMPTS_REACHED';

    for (let attempt = 1; attempt <= safeMaxAttempts; attempt++) {
      let currentSvg: string;
      try {
        currentSvg = await options.extractFn(attempt, lastRemediationPrompt);
      } catch (err) {
        // [Guard 5] 추출기 예외 발생 시 Circuit Breaker 즉시 발동
        terminationReason = 'CIRCUIT_BREAKER_TRIPPED';
        break;
      }

      // [Guard 2] 동일 SVG 중복 추출(Stagnation) 감지 -> 의미 없는 루프 즉시 중단
      const normalizedHash = crypto
        .createHash('sha256')
        .update((currentSvg || '').replace(/\s+/g, ' ').trim())
        .digest('hex');

      if (seenSvgHashes.has(normalizedHash)) {
        terminationReason = 'STAGNATION_DETECTED';
        break;
      }
      seenSvgHashes.add(normalizedHash);

      // 검수 에이전트 실행
      let report: SvgAuditReport;
      try {
        report = await auditRunner(currentSvg, options.context);
      } catch {
        report = this.auditSvgStatic(currentSvg, options.context);
      }

      history.push({
        attempt,
        score: report.score,
        passed: report.passed,
        issueCount: report.issues.length,
      });

      // [Guard 4] 최고 점수 도면 스냅샷 갱신 보존
      if (!bestCandidate || report.score > bestCandidate.report.score) {
        bestCandidate = { svgCode: currentSvg, report };
      }

      // 검수 통과 시 즉시 종료!
      if (report.passed) {
        return {
          svgCode: currentSvg,
          finalReport: report,
          attemptsUsed: attempt,
          terminationReason: 'PASSED',
          history,
        };
      }

      // 에이전트가 루프 종료 신호를 보낸 경우 즉시 종료
      if (report.terminateLoop) {
        terminationReason = 'AGENT_TERMINATE_SIGNAL';
        break;
      }

      // [Guard 3] 동일 결함 시그니처 반복 감지 -> 개선이 없으면 남은 횟수 소모 없이 조기 탈출
      const issueSignature = report.issues
        .map((i) => `${i.category}:${i.element}`)
        .sort()
        .join('|');

      if (issueSignature && seenIssueSignatures.has(issueSignature)) {
        terminationReason = 'DUPLICATE_ISSUES_EARLY_EXIT';
        break;
      }
      if (issueSignature) {
        seenIssueSignatures.add(issueSignature);
      }

      // 다음 재추출을 위한 교정 프롬프트 전달
      lastRemediationPrompt = report.remediationPrompt || this.buildRemediationPrompt(report.issues, options.context);
    }

    // 루프가 통과 없이 종료된 경우: 확보된 최고 점수 도면에 정적 자동 보정(Auto-Fix)을 적용하여 반환
    if (bestCandidate) {
      const autoFixedSvg = this.autoFixStaticIssues(bestCandidate.svgCode);
      const postFixReport = this.auditSvgStatic(autoFixedSvg, options.context);

      if (postFixReport.passed && bestCandidate.report.issues.every((i) => i.category !== 'CONTENT_MISMATCH')) {
        return {
          svgCode: autoFixedSvg,
          finalReport: postFixReport,
          attemptsUsed: history.length,
          terminationReason: 'AUTO_FIXED_PASSED',
          history,
        };
      }

      return {
        svgCode: autoFixedSvg,
        finalReport: bestCandidate.report,
        attemptsUsed: history.length,
        terminationReason,
        history,
      };
    }

    // 모든 시도가 예외로 실패한 경우 빈 리포트 반환
    return {
      svgCode: '',
      finalReport: {
        passed: false,
        score: 0,
        terminateLoop: true,
        issues: [],
        remediationPrompt: '',
      },
      attemptsUsed: history.length,
      terminationReason: 'CIRCUIT_BREAKER_TRIPPED',
      history,
    };
  }

  /**
   * SVG 내 모든 <text> 요소를 파싱하고 글자 폭을 추정하여 2D Bounding Box 계산
   */
  public static parseTextBoxes(svgCode: string): ParsedTextBox[] {
    const results: ParsedTextBox[] = [];
    const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
    let match: RegExpExecArray | null;

    while ((match = textRegex.exec(svgCode)) !== null) {
      const rawTag = match[0];
      const attrs = match[1];
      const innerRaw = match[2];
      const text = innerRaw.replace(/<[^>]+>/g, '').trim();

      const xMatch = attrs.match(/\bx\s*=\s*["']([-\d.]+)["']/i);
      const yMatch = attrs.match(/\by\s*=\s*["']([-\d.]+)["']/i);
      const fsMatch = attrs.match(/\bfont-size\s*=\s*["']([\d.]+)["']/i);
      const anchorMatch = attrs.match(/\btext-anchor\s*=\s*["'](start|middle|end)["']/i);

      const x = xMatch ? parseFloat(xMatch[1]) : 0;
      const y = yMatch ? parseFloat(yMatch[1]) : 0;
      const fontSize = fsMatch ? parseFloat(fsMatch[1]) : 10;
      const anchor = (anchorMatch ? anchorMatch[1].toLowerCase() : 'start') as 'start' | 'middle' | 'end';

      // 한글/CJK 문자는 폭 0.95em, 영문/숫자/기호는 0.58em으로 추정
      let estimatedWidth = 0;
      for (const ch of text) {
        estimatedWidth += /[\u3131-\uD79D\u3040-\u30FF\u4E00-\u9FAF]/.test(ch)
          ? fontSize * 0.95
          : fontSize * 0.58;
      }

      let left = x;
      let right = x + estimatedWidth;
      if (anchor === 'middle') {
        left = x - estimatedWidth / 2;
        right = x + estimatedWidth / 2;
      } else if (anchor === 'end') {
        left = x - estimatedWidth;
        right = x;
      }

      const top = y - fontSize * 0.85;
      const bottom = y + fontSize * 0.2;

      results.push({
        rawTag,
        text,
        x,
        y,
        fontSize,
        anchor,
        left,
        right,
        top,
        bottom,
      });
    }

    return results;
  }

  /**
   * 발견된 결함 목록을 바탕으로 Stitch edit_screens 또는 SVG 재생성기에 전달할 정밀 교정 프롬프트 합성
   */
  public static buildRemediationPrompt(issues: SvgAuditIssue[], context?: SvgStepContext): string {
    const stepHeader = context
      ? `[교정 대상: Step ${context.stepNumber} - ${context.stepTitle} (${context.topicTitle})]`
      : '[SVG 도면 정밀 교정 지침]';

    const bulletLines = issues.map(
      (iss, idx) => `${idx + 1}. [${iss.category}] ${iss.reason} -> 해결 지침: ${iss.fixInstruction}`
    );

    return `${stepHeader}
이전 추출 도면에서 다음 ${issues.length}건의 결함이 발견되었습니다. 반드시 아래 지침을 모두 반영하여 도면을 재작도하십시오:
${bulletLines.join('\n')}
- 모든 <text> 라벨이 도형 외곽선이나 다른 텍스트와 절대 겹치지 않도록 최소 14px 이상의 수직/수평 간격을 확보하십시오.
- 모든 요소가 viewBox="0 0 680 340" 내부 안전 영역(x: 15~665, y: 15~325) 안에 완전히 수용되도록 배치하십시오.`;
  }

  /**
   * SVG 도면 내부의 모든 <text> 라벨 문자열을 순서대로 추출 (다국어 마스터 라벨 추출용)
   */
  public static extractSvgTextLabels(svgCode: string): string[] {
    const labels: string[] = [];
    const textRegex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
    let match: RegExpExecArray | null;
    while ((match = textRegex.exec(svgCode)) !== null) {
      const cleaned = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      labels.push(cleaned);
    }
    return labels;
  }

  /**
   * 인라인 SVG의 각 <text> 요소에 선언적 다국어 핫스왑 바인딩 속성(data-svg-step, data-svg-label) 주입
   */
  public static bindSvgDeclarativeLabels(svgCode: string, stepIndex: number): string {
    let labelIdx = 0;
    return svgCode.replace(/<text\b([^>]*)>/gi, (_full, attrs: string) => {
      const currentIdx = labelIdx++;
      const cleanAttrs = attrs
        .replace(/\s*data-svg-step\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*data-svg-label\s*=\s*["'][^"']*["']/gi, '');
      return `<text data-svg-step="${stepIndex}" data-svg-label="${currentIdx}"${cleanAttrs}>`;
    });
  }

  /**
   * 주어진 번역 라벨 배열을 SVG <text> 요소에 대입한 SVG 문자열 반환 (다국어 바운딩 박스 시뮬레이션용)
   */
  public static applySvgTextLabels(svgCode: string, labels: string[]): string {
    let idx = 0;
    return svgCode.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (full, attrs: string) => {
      const replacement = labels[idx++];
      if (replacement === undefined) return full;
      const escaped = replacement
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<text${attrs}>${escaped}</text>`;
    });
  }

  /**
   * Wave 2 병렬 생성 시 SVG 내 <text> 요소의 개수와 문구를 사전에 기획된 plannedLabels 배열과 100% 일치하도록 강제 동기화
   * - <text>가 더 많으면 초과 태그를 제거
   * - <text>가 부족하면 안전 좌표에 누락 라벨을 추가한 뒤 정적 충돌 보정(autoFixStaticIssues) 수행
   */
  public static enforcePlannedSvgLabels(svgCode: string, plannedLabels?: string[]): string {
    if (!plannedLabels || plannedLabels.length === 0) {
      return svgCode;
    }

    const cleanPlanned = plannedLabels.map((l) => String(l || '').trim()).filter(Boolean);
    if (cleanPlanned.length === 0) return svgCode;

    let idx = 0;
    let updated = svgCode.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi, (_full, attrs: string) => {
      if (idx >= cleanPlanned.length) {
        return '';
      }
      const replacement = cleanPlanned[idx++];
      const escaped = replacement
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<text${attrs}>${escaped}</text>`;
    });

    if (idx < cleanPlanned.length) {
      const fallbackY = [30, 52, 298, 320];
      const extraNodes: string[] = [];
      while (idx < cleanPlanned.length) {
        const label = cleanPlanned[idx];
        const escaped = label
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const y = fallbackY[idx] ?? Math.min(322, 30 + idx * 22);
        const x = idx === 0 ? 24 : 340;
        const anchor = idx === 0 ? 'start' : 'middle';
        extraNodes.push(
          `  <text x="${x}" y="${y}" fill="#E5E5E5" font-family="'JetBrains Mono', monospace" font-size="11" text-anchor="${anchor}">${escaped}</text>`
        );
        idx++;
      }
      updated = updated.replace(/<\/svg>/i, `${extraNodes.join('\n')}\n</svg>`);
    }

    return this.autoFixStaticIssues(updated);
  }

  /**
   * 다국어(7개국어) 번역 라벨을 각각 SVG에 대입하여 모든 언어에서 경계 잘림/텍스트 겹침이 없는지 정적 감사 수행
   */
  public static auditMultilingualLabels(
    svgCode: string,
    labelsByLocale: Record<string, string[]>
  ): { allPassed: boolean; localeReports: Record<string, SvgAuditReport> } {
    const localeReports: Record<string, SvgAuditReport> = {};
    let allPassed = true;

    for (const [locale, labels] of Object.entries(labelsByLocale)) {
      if (!labels || labels.length === 0) continue;
      const localizedSvg = this.applySvgTextLabels(svgCode, labels);
      const report = this.auditSvgStatic(localizedSvg);
      localeReports[locale] = report;
      if (!report.passed) {
        allPassed = false;
      }
    }

    return { allPassed, localeReports };
  }
}
