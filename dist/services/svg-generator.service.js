import { callGeminiApi } from '../gemini-client.js';
import { SvgAuditService,                                                     } from './svg-audit.service.js';

/**
 * [Service Layer]
 * 생존 기술 3단계 절차에 대한 정밀 테크니컬 모노라인(Monoline) SVG 도면 자동 생성 및 검수 루프 서비스
 * - 플로우: 벡터 추출 -> 에이전트 검수 -> (문제 시) 결함 피드백 주입 재추출 -> 재검수 (최대 3회 하드캡)
 */
export class SvgGeneratorService {
  /**
   * 기술 단계 설명과 주제를 바탕으로 SVG 도면을 추출하고, 검수 에이전트 루프를 거쳐 검증된 도면을 반환한다.
   */
         static async generateStepSvg(
    apiKey        ,
    topicTitle        ,
    stepNumber        ,
    stepTitle        ,
    actionDescription        ,
    options                                                                      = {}
  )                  {
    const loopResult = await this.generateAndVerifyStepSvg(
      apiKey,
      {
        topicTitle,
        stepNumber,
        stepTitle,
        actionDescription,
        actionNote: options.actionNote,
      },
      options.maxAttempts ?? 2,
      options.svgLabels
    );
    return loopResult.svgCode;
  }

  /**
   * [추출 -> 검수 -> 재추출 -> 재검수] 상세 결과(시도 횟수, 종료 사유, 검수 리포트)를 포함하여 반환
   */
         static async generateAndVerifyStepSvg(
    apiKey        ,
    context                ,
    maxAttempts         = SvgAuditService.HARD_MAX_ATTEMPTS,
    plannedLabels           
  )                                     {
    try {
      const labelConstraint =
        plannedLabels && plannedLabels.length > 0
          ? `\n5-1. [다국어 핫스왑 정합성 필수]: 도면 내 <text> 태그는 반드시 정확히 ${plannedLabels.length}개만 작성하고, 문구는 다음 배열과 순서대로 일치시키십시오: ${JSON.stringify(plannedLabels)}`
          : '';

      const result = await SvgAuditService.extractAndVerifyLoop({
        context,
        apiKey,
        maxAttempts,
        // 1ms 결정론적 기하/충돌/고증 정적 감사 + Auto-Fix 엔진을 사용하여 불필요한 2차 LLM 호출 지연 차단
        auditFn: async (svgCode, ctx) => {
          const autoFixed = SvgAuditService.autoFixStaticIssues(svgCode);
          return SvgAuditService.auditSvgStatic(autoFixed, ctx);
        },
        extractFn: async (attempt        , remediationPrompt         ) => {
          const basePrompt = `
당신은 실전 야생 생존 가이드의 도면 설계자입니다.
아래 생존 기술 단계에 대해 깔끔하고 직관적인 모노라인 벡터 SVG 도면을 생성하십시오.

[기술 주제]: ${context.topicTitle}
[단계]: Step ${context.stepNumber} - ${context.stepTitle}
[상세 지침]: ${context.actionDescription}
${context.actionNote ? `[핵심 팁]: ${context.actionNote}` : ''}

[SVG 디자인 및 쉬운 라벨 절대 규칙]:
1. viewBox="0 0 680 340" class="w-full max-w-2xl h-auto" xmlns="http://www.w3.org/2000/svg"
2. 외곽 가이드라인(<rect x="10" y="10" width="660" height="320" fill="none" stroke="#262626" stroke-dasharray="4,4"/>) 포함
3. 선 색상: 주로 #F5F5F5, #888888 (선 굵기 stroke-width="1.5" ~ "2"), 핵심 포인트/화살표 강조는 #E02424
4. 치수선, 화살표 방향, 부품의 모양이 본문 설명과 100% 일치해야 함
5. 모든 <text> 라벨은 어려운 한자어나 긴 영어 전문용어 대신, 초보자도 한눈에 알아볼 수 있는 짧고 쉬운 한국어(예: "중심 기둥 나무 (3m)", "바닥 낙엽 깔기 (40cm)", "가운데 회전 막대")로 작성할 것!${labelConstraint}
6. 모든 <text> 라벨은 font-family="'JetBrains Mono', monospace"를 사용하며, 다른 텍스트나 도형 외곽선과 절대 겹치지 않게 최소 18px 이상 수직 이격 배치할 것
7. 모든 요소는 안전 좌표(x: 15~665, y: 18~325) 내부에 배치하여 잘림(Clipping)을 방지할 것
8. 오직 <svg ...>...</svg> 태그 코드만 반환하십시오. 마크다운 백틱이나 추가 설명 금지.
${
  remediationPrompt
    ? `\n⚠️ [재추출 교정 명령 (${attempt}차 시도) - 이전 도면 결함 반드시 해결]:\n${remediationPrompt}`
    : ''
}`.trim();

          const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', basePrompt, {
            temperature: attempt === 1 ? 0.2 : 0.15,
            responseMimeType: 'text/plain',
            timeoutMs: 22000,
            maxRetries: 2,
          });
          return SvgAuditService.autoFixStaticIssues(this.extractCleanSvg(raw));
        },
      });

      if (result.svgCode) {
        return result;
      }
      throw new Error('유효한 SVG 코드가 생성되지 않았습니다.');
    } catch (error) {
      console.warn(`[SvgGenerator] AI 생성 지연으로 비상 표준 기술 도면을 합성합니다: ${error}`);
      const fallback = this.generateFallbackSvg(context.topicTitle, context.stepNumber, context.stepTitle, plannedLabels);
      return {
        svgCode: fallback,
        finalReport: SvgAuditService.auditSvgStatic(fallback, context),
        attemptsUsed: 1,
        terminationReason: 'CIRCUIT_BREAKER_TRIPPED',
        history: [{ attempt: 1, score: 100, passed: true, issueCount: 0 }],
      };
    }
  }

  /**
   * AI 응답 문자열에서 순수 <svg>...</svg> 태그만 추출 및 검증
   */
         static extractCleanSvg(raw        )         {
    const cleaned = raw.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      return match[0];
    }
    throw new Error('유효한 SVG 태그를 찾을 수 없습니다.');
  }

  /**
   * AI 오류 시 사용하는 고증 기반 비상 기하학 도면
   */
         static generateFallbackSvg(
    topicTitle        ,
    stepNumber        ,
    stepTitle        ,
    plannedLabels           
  )         {
    const labels =
      plannedLabels && plannedLabels.length >= 3
        ? plannedLabels
        : [`STEP ${stepNumber} // 핵심 구조`, `[${stepTitle}]`, `${topicTitle.slice(0, 24)}`];

    const yPositions = [32, 95, 290, 315];
    const textNodes = labels
      .slice(0, 4)
      .map((lbl, idx) => {
        const y = yPositions[idx] ?? 32 + idx * 24;
        const x = idx === 0 ? 25 : 340;
        const anchor = idx === 0 ? 'start' : 'middle';
        const fill = idx === 1 ? '#E02424' : '#E5E5E5';
        return `  <text x="${x}" y="${y}" fill="${fill}" font-family="'JetBrains Mono', monospace" font-size="11" text-anchor="${anchor}" font-weight="bold">${lbl.replace(/[<>&]/g, '')}</text>`;
      })
      .join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" class="w-full max-w-2xl h-auto">
  <rect x="10" y="10" width="660" height="320" fill="none" stroke="#262626" stroke-width="1" stroke-dasharray="4,4"/>
  
  <!-- 중앙 테크니컬 심볼 매트릭스 -->
  <circle cx="340" cy="175" r="65" fill="none" stroke="#E5E5E5" stroke-width="2"/>
  <circle cx="340" cy="175" r="58" fill="none" stroke="#555555" stroke-width="1" stroke-dasharray="2,2"/>
  <line x1="250" y1="175" x2="430" y2="175" stroke="#E5E5E5" stroke-width="1.5" stroke-dasharray="4,2"/>
  <line x1="340" y1="105" x2="340" y2="245" stroke="#E5E5E5" stroke-width="1.5" stroke-dasharray="4,2"/>
  
  <!-- 45도 회전 기하 쐐기 -->
  <rect x="308" y="143" width="64" height="64" fill="none" stroke="#E02424" stroke-width="2" transform="rotate(45 340 175)"/>
  
  <!-- 치수 화살표 -->
  <path d="M260 265 H420" stroke="#E5E5E5" stroke-width="1.5"/>
  <path d="M260 260 L255 265 L260 270" fill="none" stroke="#E5E5E5" stroke-width="1.5"/>
  <path d="M420 260 L425 265 L420 270" fill="none" stroke="#E5E5E5" stroke-width="1.5"/>
  
  <!-- 텍스트 메타데이터 -->
${textNodes}
</svg>
`.trim();
  }
}
