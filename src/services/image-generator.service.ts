import { GeminiModelResolverService } from './gemini-model-resolver.service.ts';

export interface GenerateImageOptions {
  aspectRatio?: '1:1' | '16:9' | '4:3' | '9:16' | '3:4';
  model?: string;
  numberOfImages?: number;
  outputFormat?: 'image/jpeg' | 'image/png';
  timeoutMs?: number;
}

export interface GeneratedImageResult {
  mimeType: string;
  base64Data: string;
  buffer: Buffer;
  modelUsed: string;
}

/**
 * 🎨 [Image Generator Service]
 * 구글 AI Studio의 최신 이미지 모델(gemini-3-pro-image 등)을 자동 리졸브하여
 * 야전 생존 도구 식별 에셋 및 16:9 고화질 프리뷰 이미지를 프로그래밍 방식으로 생성하는 서비스
 */
export class ImageGeneratorService {
  /**
   * 텍스트 프롬프트를 받아 고화질 이미지를 생성
   */
  public static async generateImage(
    apiKey: string,
    prompt: string,
    options: GenerateImageOptions = {}
  ): Promise<GeneratedImageResult> {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ImageGeneratorService: GEMINI_API_KEY가 제공되지 않았습니다.');
    }

    // 1. 모델이 명시되지 않은 경우 최신 이미지 모델 자동 리졸브 (예: gemini-3-pro-image)
    const model = options.model || (await GeminiModelResolverService.resolveModel(apiKey, 'image'));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const formattedPrompt = options.aspectRatio
      ? `[Aspect Ratio: ${options.aspectRatio}]\n${prompt}`
      : prompt;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: formattedPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: options.outputFormat || 'image/jpeg',
      },
    };

    const effectiveTimeout = options.timeoutMs ?? 60000; // 이미지 생성은 최대 60초

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(effectiveTimeout),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`[Image Generator Error ${res.status} (${model})]: ${errorText}`);
    }

    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];

    // inlineData 검출
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || options.outputFormat || 'image/jpeg';
        const base64Data = part.inlineData.data;
        const buffer = Buffer.from(base64Data, 'base64');
        return {
          mimeType,
          base64Data,
          buffer,
          modelUsed: model,
        };
      }
    }

    // parts 내 data:image base64 텍스트 검출 (폴백)
    for (const part of parts) {
      if (typeof part.text === 'string' && part.text.includes('data:image/')) {
        const match = part.text.match(/data:(image\/[a-zA-Z]+);base64,([A-Za-z0-9+/=]+)/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          return {
            mimeType,
            base64Data,
            buffer,
            modelUsed: model,
          };
        }
      }
    }

    throw new Error(`[Image Generator (${model})]: 이미지 데이터를 응답에서 추출하지 못했습니다.`);
  }
}
