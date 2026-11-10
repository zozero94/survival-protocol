import dns from 'node:dns';
import { GeminiModelResolverService } from './services/gemini-model-resolver.service.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

async function delayWithBackoff(attempt        , deadlineAt         )                   {
  const jitter = Math.floor(Math.random() * 700);
  const delayMs = 1200 * Math.pow(2, attempt - 1) + jitter;
  const afterDelayBudget = deadlineAt ? deadlineAt - Date.now() - delayMs : Infinity;
  if (afterDelayBudget < 2000) return false;
  await new Promise((res) => setTimeout(res, delayMs));
  return true;
}

/**
 * 구글 공식 REST API 기반 경량 제미나이 클라이언트
 * 외부 무거운 SDK 의존성 없이 순수 Node.js native fetch로 초고속 동작
 * 모델명이 생략되거나 'auto'인 경우 GeminiModelResolverService를 통해 런타임 최신 모델 자동 해석
 * 일시적 503(수요 급증)/429 발생 시 동일 모델로 지수 백오프(Exponential Backoff) 재시도 수행
 */
export async function callGeminiApi(
  apiKey        ,
  model         = 'auto',
  prompt        ,
  options   
                               
                         
                              
                       
                        
                        
                         
                           
    = {}
)                  {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('callGeminiApi: GEMINI_API_KEY가 제공되지 않았습니다.');
  }

  const effectiveModel = (model && model !== 'auto')
    ? model
    : await GeminiModelResolverService.resolveModel(apiKey, 'flash');

  if (!/^[a-zA-Z0-9._-]+$/.test(effectiveModel)) {
    throw new Error(`[Security]: 허용되지 않는 특수문자가 포함된 모델 식별자입니다: ${effectiveModel}`);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent`;

  const parts        = [];
  if (options.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: options.imageMimeType || 'image/png',
        data: options.imageBase64,
      },
    });
  }
  parts.push({ text: prompt });

  const body      = {
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
  let lastError               = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remainingBudget = options.deadlineAt ? options.deadlineAt - Date.now() : Infinity;
    if (remainingBudget <= 1500) {
      throw lastError || new Error(`Gemini API(${effectiveModel}) 전체 실행 예산 시간을 초과했습니다.`);
    }
    const effectiveTimeout = Math.min(perAttemptTimeout, Math.max(1500, remainingBudget));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(effectiveTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`[Gemini API Error ${response.status} (${effectiveModel})]: ${errorText}`);
        if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
          if (await delayWithBackoff(attempt, options.deadlineAt)) {
            continue;
          }
        }
        throw lastError;
      }

      const data = await response.json();

      if (data.promptFeedback?.blockReason === 'SAFETY') {
        throw new Error(`[Gemini API Safety Block]: 프롬프트가 구글 안전 정책에 의해 차단되었습니다.`);
      }

      const candidate = data.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error(`[Gemini API Safety Block]: 응답 생성이 구글 안전 정책에 의해 중단되었습니다.`);
      }

      const candidateParts = candidate?.content?.parts;
      // CoT(사고 과정) 파트(p.thought === true)를 배제하고 최종 텍스트 파트 취득
      const textPart = Array.isArray(candidateParts)
        ? (candidateParts.find((p     ) => typeof p?.text === 'string' && !p.thought) ||
           candidateParts.find((p     ) => typeof p?.text === 'string'))
        : null;
      const text = textPart?.text;

      if (!text) {
        throw new Error(`Gemini API(${effectiveModel})로부터 유효한 텍스트 응답을 받지 못했습니다.`);
      }

      return text;
    } catch (err     ) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // 안전 정책 차단은 재시도하지 않고 즉시 throw
      if (lastError.message.includes('[Gemini API Safety Block]')) {
        throw lastError;
      }

      const isTransient =
        err?.name === 'TimeoutError' ||
        err?.name === 'AbortError' ||
        String(err).includes('503') ||
        String(err).includes('429');

      if (isTransient && attempt < maxAttempts) {
        if (await delayWithBackoff(attempt, options.deadlineAt)) {
          continue;
        }
      }
      throw lastError;
    }
  }

  throw lastError || new Error(`Gemini API(${effectiveModel}) 호출에 실패했습니다.`);
}
