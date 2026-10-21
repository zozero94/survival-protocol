import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

/**
 * [Service Layer]
 * Gemini 3.8 Flash TTS 기반 내레이션 음성 생성 서비스
 * - 텍스트 해시 기반 스마트 캐싱으로 불필요한 API 호출 방지
 * - API 키 부재 및 네트워크 오류 시 빌드 파이프라인 중단 없는 Graceful Fallback
 */
export class TtsService {
          static aiClient                     = null;

          static getClient()                     {
    if (this.aiClient) return this.aiClient;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.indexOf('your_') === 0) return null;
    try {
      this.aiClient = new GoogleGenAI({ apiKey });
      return this.aiClient;
    } catch {
      return null;
    }
  }

          static computeHash(text        )         {
    return crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
  }

  /**
   * 텍스트를 고화질 음성(WAV)으로 합성하여 outputPath에 저장한다.
   * 캐시가 유효하면 기존 오디오 파일을 즉시 재사용한다.
   */
         static async synthesizeSpeech(
    text        ,
    outputPath        ,
    locale         = 'ko'
  )                                                                                     {
    if (!text || !text.trim()) {
      return { success: false, cached: false, error: 'Empty text' };
    }

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const textHash = this.computeHash(text);
    const hashFile = `${outputPath}.hash`;

    // 1. 스마트 캐시 확인
    if (fs.existsSync(outputPath) && fs.existsSync(hashFile)) {
      const existingHash = fs.readFileSync(hashFile, 'utf-8').trim();
      if (existingHash === textHash && fs.statSync(outputPath).size > 1000) {
        return { success: true, cached: true, audioPath: outputPath };
      }
    }

    // 2. Gemini 클라이언트 확인
    const client = this.getClient();
    if (!client) {
      return {
        success: false,
        cached: false,
        error: 'GEMINI_API_KEY missing or invalid - skipped audio synthesis',
      };
    }

    // 3. Gemini 3.8 Flash TTS 호출
    try {
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: text,
        config: {
          responseModalities: ['AUDIO'],
        },
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const audioData = part?.inlineData?.data;

      if (!audioData) {
        return { success: false, cached: false, error: 'No audio data received in response' };
      }

      const buffer = Buffer.from(audioData, 'base64');
      fs.writeFileSync(outputPath, buffer);
      fs.writeFileSync(hashFile, textHash, 'utf-8');

      return { success: true, cached: false, audioPath: outputPath };
    } catch (err         ) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { success: false, cached: false, error: errMsg };
    }
  }
}
