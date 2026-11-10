import { GeminiModelResolverService } from './gemini-model-resolver.service.js';

                                       
                                                        
                 
                                            
                     
 

                                       
                   
                     
                 
                    
                      
 

const VALID_ASPECT_RATIOS = new Set(['1:1', '16:9', '4:3', '9:16', '3:4']);

/**
 * 🎨 [Image Generator Service]
 * 구글 AI Studio의 최신 이미지 모델을 자동 리졸브하여
 * 야전 생존 도구 식별 에셋 및 16:9 고화질 프리뷰 이미지를 프로그래밍 방식으로 생성하는 서비스
 */
export class ImageGeneratorService {
  /**
   * 텍스트 프롬프트를 받아 고화질 이미지를 생성
   */
         static async generateImage(
    apiKey        ,
    prompt        ,
    options                       = {}
  )                                {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ImageGeneratorService: GEMINI_API_KEY가 제공되지 않았습니다.');
    }

    if (options.aspectRatio && !VALID_ASPECT_RATIOS.has(options.aspectRatio)) {
      throw new Error(`ImageGeneratorService: 유효하지 않은 aspectRatio입니다: ${options.aspectRatio}`);
    }

    const model = (options.model && options.model !== 'auto')
      ? options.model
      : await GeminiModelResolverService.resolveModel(apiKey, 'image');

    if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
      throw new Error(`ImageGeneratorService: 허용되지 않는 모델 식별자입니다: ${model}`);
    }

    const effectiveTimeout = options.timeoutMs ?? 60000;
    const isImagenModel = model.toLowerCase().startsWith('imagen-');

    // 상표권 침해 방지 및 생존 교육 맥락 시스템 지침
    const safePrompt = `[Context: Emergency survival technical guide. Utilitarian, unbranded, generic tools and items only. Absolutely NO commercial brand logos, trademarks, or copyrighted text labels.]\n${
      options.aspectRatio ? `[Aspect Ratio: ${options.aspectRatio}]\n` : ''
    }${prompt}`;

    if (isImagenModel) {
      // 1. Imagen 3 계열 모델: :predict 엔드포인트 호출
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
      const body = {
        instances: [{ prompt: safePrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: options.aspectRatio || '1:1',
          outputOptions: {
            mimeType: options.outputFormat || 'image/jpeg',
          },
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(effectiveTimeout),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[Image Generator Error ${res.status} (${model})]: ${errorText}`);
      }

      const data = await res.json();
      const prediction = data.predictions?.[0];
      const base64Data = prediction?.bytesBase64Encoded;
      const mimeType = prediction?.mimeType || options.outputFormat || 'image/jpeg';

      if (!base64Data) {
        throw new Error(`[Image Generator (${model})]: Imagen 응답에서 이미지 데이터를 추출하지 못했습니다.`);
      }

      return {
        mimeType,
        base64Data,
        buffer: Buffer.from(base64Data, 'base64'),
        modelUsed: model,
        isAiGenerated: true,
      };
    }

    // 2. Gemini 멀티모달 이미지 생성 모델: :generateContent 호출
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: safePrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: options.outputFormat || 'image/jpeg',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(effectiveTimeout),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`[Image Generator Error ${res.status} (${model})]: ${errorText}`);
    }

    const data = await res.json();

    if (data.promptFeedback?.blockReason === 'SAFETY') {
      throw new Error(`[Image Generator Safety Block]: 프롬프트가 구글 안전 정책에 의해 차단되었습니다.`);
    }

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error(`[Image Generator Safety Block]: 이미지 생성이 구글 안전 정책에 의해 중단되었습니다.`);
    }

    const parts        = candidate?.content?.parts || [];

    // inlineData 검출
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || options.outputFormat || 'image/jpeg';
        const rawBase64 = String(part.inlineData.data).replace(/\s+/g, '');
        return {
          mimeType,
          base64Data: rawBase64,
          buffer: Buffer.from(rawBase64, 'base64'),
          modelUsed: model,
          isAiGenerated: true,
        };
      }
    }

    // parts 내 data:image base64 텍스트 폴백
    for (const part of parts) {
      if (typeof part.text === 'string' && part.text.includes('data:image/')) {
        const match = part.text.match(/data:(image\/[a-zA-Z]+);base64,([A-Za-z0-9+/=]+)/);
        if (match) {
          const mimeType = match[1];
          const rawBase64 = match[2].replace(/\s+/g, '');
          return {
            mimeType,
            base64Data: rawBase64,
            buffer: Buffer.from(rawBase64, 'base64'),
            modelUsed: model,
            isAiGenerated: true,
          };
        }
      }
    }

    throw new Error(`[Image Generator (${model})]: 이미지 데이터를 응답에서 추출하지 못했습니다.`);
  }
}
