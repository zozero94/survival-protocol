import dns from 'node:dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

/**
 * 구글 공식 REST API 기반 경량 제미나이 클라이언트
 * 외부 무거운 SDK 의존성 없이 순수 Node.js native fetch로 초고속 동작
 * 하위 버전 모델로 절대 다운그레이드하지 않고, 지정된 최신 모델(gemini-3.8-flash)만 사용하며
 * 일시적 503(수요 급증)/429 발생 시 동일 최신 모델로 지수 백오프(Exponential Backoff) 재시도 수행
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
    maxRetries?: number;
    deadlineAt?: number;
    imageBase64?: string;
    imageMimeType?: string;
  } = {}
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [];
  if (options.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: options.imageMimeType || 'image/png',
        data: options.imageBase64,
      },
    });
  }
  parts.push({ text: prompt });

  const body: any = {
    contents: [
      {
        role: 'user',
        parts,
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

  const maxAttempts = Math.max(1, Math.min(options.maxRetries ?? 3, 4));
  const perAttemptTimeout = options.timeoutMs ?? 30000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remainingBudget = options.deadlineAt ? options.deadlineAt - Date.now() : Infinity;
    if (remainingBudget <= 1500) {
      throw lastError || new Error(`Gemini API(${model}) 전체 실행 예산 시간을 초과했습니다.`);
    }
    const effectiveTimeout = Math.min(perAttemptTimeout, Math.max(1500, remainingBudget));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(effectiveTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`[Gemini API Error ${response.status} (${model})]: ${errorText}`);
        if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 700);
          const delayMs = 1200 * Math.pow(2, attempt - 1) + jitter;
          const afterDelayBudget = options.deadlineAt ? options.deadlineAt - Date.now() - delayMs : Infinity;
          if (afterDelayBudget < 2000) {
            throw lastError;
          }
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts;
      const textPart = Array.isArray(parts) ? parts.find((p: any) => typeof p?.text === 'string') : null;
      const text = textPart?.text;

      if (!text) {
        throw new Error(`Gemini API(${model})로부터 유효한 텍스트 응답을 받지 못했습니다.`);
      }

      return text;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTransient =
        err?.name === 'TimeoutError' ||
        err?.name === 'AbortError' ||
        String(err).includes('503') ||
        String(err).includes('429');
      if (isTransient && attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 700);
        const delayMs = 1200 * Math.pow(2, attempt - 1) + jitter;
        const afterDelayBudget = options.deadlineAt ? options.deadlineAt - Date.now() - delayMs : Infinity;
        if (afterDelayBudget < 2000) {
          throw lastError;
        }
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error(`Gemini API(${model}) 호출에 실패했습니다.`);
}
