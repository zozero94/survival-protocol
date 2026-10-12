import fs from 'fs';
import path from 'path';
import type { Protocol } from '../types/protocol.types.ts';
import { SvgAuditService, type SvgAuditReport, type SvgVerificationLoopResult } from './svg-audit.service.ts';

export interface StitchAuditSummary {
  protocol: Protocol;
  allPassed: boolean;
  stepReports: Record<string, SvgAuditReport>;
  combinedRemediationPrompt: string;
}

/**
 * [Service Layer]
 * 스티치(Stitch) HTML 분석, 도면(SVG) 추출 및 검수 에이전트 연동 서비스
 * - 플로우: Stitch 벡터 추출 -> 에이전트 검수 -> (문제 시) Stitch edit_screens 재추출 -> 재검수
 */
export class StitchService {
  /**
   * HTML 원문에서 SVG 도면 파일들과 프로토콜 엔티티를 정밀 추출하고 1차 정적 검수/자동 보정을 거쳐 저장
   */
  public static extractProtocol(
    htmlContent: string,
    svgsOutputDir: string,
    options: { protocolPrefix?: string; autoFix?: boolean } = {}
  ): Protocol {
    fs.mkdirSync(svgsOutputDir, { recursive: true });
    const autoFix = options.autoFix ?? true;
    const prefix = options.protocolPrefix ? `${options.protocolPrefix}-` : '';

    // 1. 메타데이터
    const titleMatch = htmlContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? this.stripTags(titleMatch[1]) : '야생 생존 프로토콜';

    const summaryMatch = htmlContent.match(/<h1[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
    const summary = summaryMatch ? this.stripTags(summaryMatch[1]) : '';

    // 2. 체크리스트 재료
    const materials: Protocol['materials'] = [];
    const labelRegex = /<label[^>]*class="[^"]*cursor-pointer[^"]*"[\s\S]*?<\/label>/gi;
    const labelMatches = htmlContent.match(labelRegex) || [];

    labelMatches.forEach((labelHtml, idx) => {
      const nameMatch = labelHtml.match(/<(?:div|span) class="font-bold[^>]*>([\s\S]*?)<\/(?:div|span)>/i);
      const descMatch = labelHtml.match(/<(?:div|p) class="[^"]*text-\[11px\][^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/i);
      if (nameMatch) {
        materials.push({
          id: `mat-0${idx + 1}`,
          name: this.stripTags(nameMatch[1]),
          desc: descMatch ? this.stripTags(descMatch[1]) : '',
        });
      }
    });

    // 3. 단계별 도면(SVG) 및 카드
    const steps: Protocol['steps'] = [];
    const stepBlockRegex = /<!-- STEP (0[1-9]) -->[\s\S]*?(?=<!-- STEP|\s*<\/section>|\s*<\/div>\s*<\/div>\s*<!-- FATAL)/gi;
    const stepBlocks = htmlContent.match(stepBlockRegex) || [];

    stepBlocks.forEach((block, idx) => {
      const numMatch = block.match(/<!-- STEP (0[1-9]) -->/i);
      const stepNum = numMatch ? numMatch[1] : `0${idx + 1}`;

      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const stepTitle = titleMatch ? this.stripTags(titleMatch[1]) : `단계 ${stepNum}`;

      const descMatch = block.match(/<p class="[^"]*(?:text-neutral-300|text-text-primary)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const stepDesc = descMatch ? this.stripTags(descMatch[1]) : '';

      const actionMatch = block.match(/<(?:p|div) class="[^"]*(?:text-neutral-400|border-l)[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i);
      const actionNote = actionMatch ? this.stripTags(actionMatch[1]) : '';

      const svgMatch = block.match(/<svg[\s\S]*?<\/svg>/i);
      const svgFileName = `${prefix}step-${stepNum.toLowerCase()}.svg`;

      if (svgMatch) {
        let svgCode = svgMatch[0];
        if (autoFix) {
          const audit = SvgAuditService.auditSvgStatic(svgCode, {
            topicTitle: title,
            stepNumber: stepNum,
            stepTitle,
            actionDescription: stepDesc,
            actionNote,
          });
          if (!audit.passed) {
            svgCode = SvgAuditService.autoFixStaticIssues(svgCode);
          }
        }
        const standaloneSvg = svgCode.startsWith('<?xml')
          ? svgCode
          : `<?xml version="1.0" encoding="UTF-8"?>\n${svgCode}`;
        fs.writeFileSync(path.join(svgsOutputDir, svgFileName), standaloneSvg, 'utf-8');
      }

      steps.push({
        stepNumber: stepNum,
        title: stepTitle,
        description: stepDesc,
        actionNote,
        svgFileName,
      });
    });

    // 4. 치명적 실수
    const fatalTitleMatch = htmlContent.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
    const fatalDescMatch = htmlContent.match(/<h4[\s\S]*?<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/i);

    return {
      protocolId: options.protocolPrefix ? `PR-${options.protocolPrefix}` : 'PR-01',
      category: 'WATER',
      title,
      threatLevel: 'CRITICAL',
      threatLevelText: '[위험 등급: 치명적(CRITICAL)]',
      summary,
      timeRequired: '15분 (15 MINUTES)',
      successRate: '99.8% (열탕 살균 후)',
      difficulty: '1등급 (원시 생존 기술)',
      outputPerHour: '1.5리터 / 시간',
      materials,
      steps,
      fatalMistake: {
        title: fatalTitleMatch ? this.stripTags(fatalTitleMatch[1]) : '치명적 착각: 즉시 마시면 안 됩니다.',
        description: fatalDescMatch ? this.stripTags(fatalDescMatch[1]) : '',
        consequence: '끓임 생략 시 결과: 급성 크립토스포리디움증 감염 및 96시간 내 탈수 사망',
      },
    };
  }

  /**
   * Stitch에서 추출된 특정 단계 SVG에 대해 [추출 -> 에이전트 검수 -> 재추출 -> 재검수] 루프를 수행한다.
   * (무한 루프 방지 5중 가드 적용, 최대 3회 제한)
   */
  public static async extractStepSvgWithAuditLoop(options: {
    stepNumber: string;
    stepTitle: string;
    actionDescription: string;
    topicTitle: string;
    actionNote?: string;
    apiKey?: string;
    maxAttempts?: number;
    fetchSvgFn: (attempt: number, remediationPrompt?: string) => Promise<string>;
  }): Promise<SvgVerificationLoopResult> {
    return SvgAuditService.extractAndVerifyLoop({
      context: {
        topicTitle: options.topicTitle,
        stepNumber: options.stepNumber,
        stepTitle: options.stepTitle,
        actionDescription: options.actionDescription,
        actionNote: options.actionNote,
      },
      apiKey: options.apiKey,
      maxAttempts: options.maxAttempts,
      extractFn: options.fetchSvgFn,
    });
  }

  private static stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').trim();
  }
}
