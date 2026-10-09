import { callGeminiApi } from '../gemini-client.ts';

export interface PlannedTopic {
  protocolId: string;
  category: 'FIRE' | 'WATER' | 'TOOLS' | 'SHELTER' | 'FOOD';
  koreanTitle: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  stitchPrompt: string;
  summary: string;
}

const FALLBACK_TOPIC: PlannedTopic = {
  protocolId: 'PR-02',
  category: 'FIRE',
  koreanTitle: '프로토콜 #02: 마찰열을 이용한 원시 활비비(Bow Drill) 발화법',
  threatLevel: 'CRITICAL',
  summary: '저체온증으로 인한 3시간 이내 사망을 막기 위해 주변의 나뭇가지와 끈으로 불씨를 피워내는 원시 발화 절차입니다.',
  stitchPrompt: `[DESIGN PHILOSOPHY: Strict Minimalist Brutalism, Pure Black & White #000000 and #FFFFFF, 1px crisp borders, sharp corners, monospace stamps] 
Create an ultra-readable responsive survival manual screen for 'PROTOCOL #02: Bow Drill Primitive Fire Ignition'.
Sections:
1. Header with [ARCHIVE-0] and Dark/Light toggle.
2. Hero hook with [THREAT: CRITICAL].
3. Fast checklist for 3 items (Dry hardwood hearth board, Carved spindle, Bow branch with cordage).
4. 3-step vertical action cards with 1:1 square technical line-art sketch containers:
   - Step 01: Carving the 45-degree V-notch on hearth board
   - Step 02: High-friction downward drilling with palm socket
   - Step 03: Transferring smoking ember into bird-nest tinder bundle and blowing to flame
5. Bold inverted Fatal Mistake warning card ('FATAL: Wet tinder will drain your remaining body heat without catching fire').
6. Sticky bottom bar for Save and Share.`,
};

/**
 * [Service Layer]
 * Gemini 3.8 Flash 최신 모델을 활용한 생존 프로토콜 자동 기획 서비스
 */
export class GeminiService {
  public static async planNextTopic(apiKey: string, existingTitles: string[] = []): Promise<PlannedTopic> {
    const prompt = `당신은 '아카이브-0: 인류 멸망 후 원시 생존 매뉴얼'의 수석 전술 기획자입니다.
기존에 다룬 주제 목록:
${existingTitles.map((t) => `- ${t}`).join('\n')}

다음 순서로 다룰 가장 후킹하고 실용적인 원시 생존 기술 1개를 기획하세요.
(예: 마찰 발화법, 쐐기풀/나무껍질로 밧줄 꼬기, 노천 진흙 토기 굽기 등)

그리고 이 주제를 스티치(Stitch)가 가장 정교한 흑백 도면과 브루탈리즘 UI로 렌더링할 수 있도록 **영문 스티치 프롬프트**를 함께 작성하세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "protocolId": "PR-02",
  "category": "FIRE",
  "koreanTitle": "...",
  "threatLevel": "CRITICAL",
  "summary": "...",
  "stitchPrompt": "..."
}`;

    try {
      const rawJson = await callGeminiApi(apiKey, 'gemini-3.8-flash', prompt, {
        responseMimeType: 'application/json',
        temperature: 0.3,
      });
      return JSON.parse(rawJson) as PlannedTopic;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`ℹ️ [Gemini Service] API 제한으로 인해 고증 큐레이션 풀에서 다음 프로토콜을 로드합니다. (${errMsg})`);
      return FALLBACK_TOPIC;
    }
  }
}
