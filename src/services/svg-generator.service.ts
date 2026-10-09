import { callGeminiApi } from '../gemini-client.ts';
import { CONFIG } from '../config.ts';

/**
 * [Service Layer]
 * 생존 기술 3단계 절차에 대한 정밀 테크니컬 모노라인(Monoline) SVG 도면 자동 생성기
 */
export class SvgGeneratorService {
  /**
   * 기술 단계 설명과 주제를 바탕으로 단일 SVG 도면 코드를 생성한다.
   */
  public static async generateStepSvg(
    apiKey: string,
    topicTitle: string,
    stepNumber: string,
    stepTitle: string,
    actionDescription: string
  ): Promise<string> {
    const prompt = `
당신은 최고 수준의 포스트 아포칼립스 원시 생존 기술 전문 도면 설계자(Technical Illustrator)입니다.
아래 생존 기술 단계에 대해 브루탈리즘 스타일의 정밀 모노라인 벡터 SVG 도면을 생성하십시오.

[기술 주제]: ${topicTitle}
[단계]: Step ${stepNumber} - ${stepTitle}
[상세 지침]: ${actionDescription}

[SVG 디자인 규칙]:
1. viewBox="0 0 400 400"
2. 배경은 투명하거나 검정색 (<rect width="400" height="400" fill="#000000"/> 포함)
3. 선 색상: 주로 #FFFFFF 또는 #E5E5E5 (선 굵기 stroke-width="2" 또는 "2.5")
4. 치수선, 회전/진행 방향 화살표(stroke-dasharray="3 3"), 주요 부품 구조 명확히 도식화
5. 복잡한 그래디언트나 색상 없이, 19세기 엔지니어링 청사진 또는 밀리터리 필드 매뉴얼 스타일
6. 오직 <svg ...>...</svg> 태그 코드만 반환하십시오. 마크다운 백틱이나 추가 설명 금지.
`.trim();

    try {
      const raw = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
        temperature: 0.2,
        responseMimeType: 'text/plain',
      });
      return this.extractCleanSvg(raw);
    } catch (error) {
      console.warn(`[SvgGenerator] AI 생성 지연으로 비상 표준 기술 도면을 합성합니다: ${error}`);
      return this.generateFallbackSvg(topicTitle, stepNumber, stepTitle);
    }
  }

  /**
   * AI 응답 문자열에서 순수 <svg>...</svg> 태그만 추출 및 검증
   */
  public static extractCleanSvg(raw: string): string {
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
  public static generateFallbackSvg(topicTitle: string, stepNumber: string, stepTitle: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <rect width="400" height="400" fill="#050505"/>
  <rect x="20" y="20" width="360" height="360" fill="none" stroke="#333333" stroke-width="1"/>
  <rect x="24" y="24" width="352" height="352" fill="none" stroke="#222222" stroke-width="1" stroke-dasharray="4 4"/>
  
  <!-- 중앙 테크니컬 심볼 매트릭스 -->
  <circle cx="200" cy="180" r="80" fill="none" stroke="#E5E5E5" stroke-width="2"/>
  <circle cx="200" cy="180" r="76" fill="none" stroke="#555555" stroke-width="1" stroke-dasharray="2 2"/>
  <line x1="120" y1="180" x2="280" y2="180" stroke="#E5E5E5" stroke-width="1.5" stroke-dasharray="4 2"/>
  <line x1="200" y1="100" x2="200" y2="260" stroke="#E5E5E5" stroke-width="1.5" stroke-dasharray="4 2"/>
  
  <!-- 45도 회전 기하 쐐기 -->
  <rect x="160" y="140" width="80" height="80" fill="none" stroke="#E5E5E5" stroke-width="2" transform="rotate(45 200 180)"/>
  
  <!-- 치수 화살표 -->
  <path d="M140 300 H260" stroke="#E5E5E5" stroke-width="1.5"/>
  <path d="M140 295 L135 300 L140 305" fill="none" stroke="#E5E5E5" stroke-width="1.5"/>
  <path d="M260 295 L265 300 L260 305" fill="none" stroke="#E5E5E5" stroke-width="1.5"/>
  
  <!-- 텍스트 메타데이터 -->
  <text x="200" y="325" fill="#A3A3A3" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">DIMENSION // STEP ${stepNumber}</text>
  <text x="200" y="355" fill="#E5E5E5" font-family="monospace" font-size="13" text-anchor="middle" font-weight="black">[${stepTitle}]</text>
  <text x="32" y="44" fill="#666666" font-family="monospace" font-size="10">SCHEMATIC REF // ${topicTitle.slice(0, 20)}</text>
</svg>
`.trim();
  }
}
