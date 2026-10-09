/**
 * 구글 공식 REST API 기반 경량 제미나이 클라이언트
 * 외부 무거운 SDK 의존성 없이 순수 Node.js native fetch로 초고속 동작
 */
export async function callGeminiApi(
  apiKey: string,
  model: string,
  prompt: string,
  options: {
    systemInstruction?: string;
    temperature?: number;
    responseMimeType?: string;
    timeoutMs?: number;
  } = {}
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      responseMimeType: options.responseMimeType ?? 'application/json'
    }
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Gemini API Error ${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API로부터 유효한 텍스트 응답을 받지 못했습니다.');
  }

  return text;
}
