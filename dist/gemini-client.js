import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

/**
 * 구글 공식 REST API 기반 경량 제미나이 클라이언트
 * 외부 무거운 SDK 의존성 없이 순수 Node.js native fetch로 초고속 동작
 * 특정 모델(예: gemini-3.8-flash)이 503 과부하 상태일 때 즉시 가용 플래시 모델로 자동 폴백
 */
export async function callGeminiApi(
  apiKey        ,
  model        ,
  prompt        ,
  options   
                               
                         
                              
                       
    = {}
)                  {
  const candidates = Array.from(
    new Set([model, 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.6-flash'])
  );

  const body      = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      responseMimeType: options.responseMimeType ?? 'application/json',
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  let lastError               = null;
  const perAttemptTimeout = Math.min(options.timeoutMs ?? 25000, 25000);

  for (const candidateModel of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidateModel}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(perAttemptTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`[Gemini API Error ${response.status} (${candidateModel})]: ${errorText}`);
        // 503(과부하), 429(쿼터), 404(모델 변경) 시 다음 폴백 모델 시도
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = new Error(`Gemini API(${candidateModel})로부터 유효한 텍스트 응답을 받지 못했습니다.`);
        continue;
      }

      return text;
    } catch (err     ) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || String(err).includes('503')) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Gemini API 호출에 실패했습니다.');
}
