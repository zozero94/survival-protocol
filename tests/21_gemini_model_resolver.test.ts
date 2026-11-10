import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GeminiModelResolverService } from '../src/services/gemini-model-resolver.service.ts';
import { ImageGeneratorService } from '../src/services/image-generator.service.ts';
import { callGeminiApi } from '../src/gemini-client.ts';

describe('🤖 [Suite 21: 제미나이 및 이미지 모델 동적 자동 리졸버 검증]', () => {
  const resetResolverEnv = () => {
    GeminiModelResolverService.clearCache();
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FLASH_MODEL;
    delete process.env.GEMINI_PRO_MODEL;
    delete process.env.GEMINI_IMAGE_MODEL;
    delete process.env.GEMINI_TTS_MODEL;
  };

  beforeEach(() => {
    resetResolverEnv();
  });

  afterEach(() => {
    resetResolverEnv();
  });

  it('21-1: Flash 모델 목록에서 최신 버전(3.8 > 3.6 > 2.5)을 정확히 자동 선택해야 한다', () => {
    const modelList = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
    ];

    const bestFlash = GeminiModelResolverService.selectBestFlashModel(modelList);
    assert.strictEqual(bestFlash, 'gemini-3.8-flash');
  });

  it('21-2: 신규 버전(예: 3.9-flash 또는 4.0-flash)이 출시되었을 때 코드 수정 없이 즉각 1순위로 자동 승격되어야 한다', () => {
    const futureModelList = [
      'gemini-2.5-flash',
      'gemini-3.8-flash',
      'gemini-3.9-flash',
      'gemini-4.0-flash',
    ];

    const bestFlash = GeminiModelResolverService.selectBestFlashModel(futureModelList);
    assert.strictEqual(bestFlash, 'gemini-4.0-flash');
  });

  it('21-3: 동일 메이저/마이너 버전인 경우 일반 flash가 flash-lite보다 우선 선택되어야 한다', () => {
    const list = [
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
    ];

    const bestFlash = GeminiModelResolverService.selectBestFlashModel(list);
    assert.strictEqual(bestFlash, 'gemini-3.5-flash');
  });

  it('21-4: 이미지 모델 목록 중 최고 화질/추론 모델(gemini-3-pro-image > flash-image > imagen-3)을 정확히 선택해야 한다', () => {
    const imageModels = [
      'imagen-3.0-generate-002',
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
    ];

    const bestImage = GeminiModelResolverService.selectBestImageModel(imageModels);
    assert.strictEqual(bestImage, 'gemini-3-pro-image');
  });

  it('21-5: 미래에 gemini-4-pro-image가 출시되면 자동으로 최신 이미지 모델로 선택되어야 한다', () => {
    const futureImageModels = [
      'gemini-3-pro-image',
      'gemini-4-pro-image',
      'gemini-3.1-flash-image',
    ];

    const bestImage = GeminiModelResolverService.selectBestImageModel(futureImageModels);
    assert.strictEqual(bestImage, 'gemini-4-pro-image');
  });

  it('21-6: TTS 음성 모델 중 최신 Flash TTS 버전을 정확히 선택해야 한다', () => {
    const ttsModels = [
      'gemini-2.5-flash-tts',
      'gemini-3.8-flash-lite-tts',
      'gemini-3.8-flash-tts',
    ];

    const bestTts = GeminiModelResolverService.selectBestTtsModel(ttsModels);
    assert.strictEqual(bestTts, 'gemini-3.8-flash-tts');
  });

  it('21-7: Pro 추론 모델 중 최신 Pro 버전을 정확히 선택해야 한다', () => {
    const proModels = [
      'gemini-2.5-pro',
      'gemini-3-pro',
      'gemini-3.1-pro',
    ];

    const bestPro = GeminiModelResolverService.selectBestProModel(proModels);
    assert.strictEqual(bestPro, 'gemini-3.1-pro');
  });

  it('21-8: 모델 목록이 비어있거나 매칭되지 않을 경우 무중단 안전 베이스라인으로 폴백해야 한다', () => {
    const emptyList: string[] = [];
    const resolved = GeminiModelResolverService.rankAndSelectBestModels(emptyList);

    assert.strictEqual(resolved.flash, GeminiModelResolverService.BASELINE_MODELS.flash);
    assert.strictEqual(resolved.pro, GeminiModelResolverService.BASELINE_MODELS.pro);
    assert.strictEqual(resolved.image, GeminiModelResolverService.BASELINE_MODELS.image);
    assert.strictEqual(resolved.tts, GeminiModelResolverService.BASELINE_MODELS.tts);
  });

  it('21-9: 환경변수 수동 오버라이드가 설정되어 있으면 API 조회 없이 해당 모델을 최우선 적용해야 한다', async () => {
    process.env.GEMINI_MODEL = 'gemini-custom-flash-pinned';
    process.env.GEMINI_IMAGE_MODEL = 'gemini-custom-image-pinned';

    const flash = await GeminiModelResolverService.resolveModel('any-key', 'flash');
    const image = await GeminiModelResolverService.resolveModel('any-key', 'image');

    assert.strictEqual(flash, 'gemini-custom-flash-pinned');
    assert.strictEqual(image, 'gemini-custom-image-pinned');
  });

  it('21-10: API 키가 없는 환경에서는 네트워크 호출 없이 즉시 안전 베이스라인 모델을 반환해야 한다', async () => {
    const flash = await GeminiModelResolverService.resolveModel('', 'flash');
    const image = await GeminiModelResolverService.resolveModel('', 'image');

    assert.strictEqual(flash, GeminiModelResolverService.BASELINE_MODELS.flash);
    assert.strictEqual(image, GeminiModelResolverService.BASELINE_MODELS.image);
  });

  it('21-11: ImageGeneratorService는 API 키가 없으면 안전하게 즉시 에러를 발생시켜야 한다', async () => {
    await assert.rejects(
      async () => {
        await ImageGeneratorService.generateImage('', 'A survival knife carved from flint stone');
      },
      {
        message: /GEMINI_API_KEY가 제공되지 않았습니다/,
      }
    );
  });

  it('21-12: fetchAvailableModels는 generateContent/predict 미지원 모델을 제외하고 models/ 접두사를 정제해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = (async (url: any, init: any) => {
      capturedHeaders = init?.headers || {};
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }, // 제외
            { name: 'models/imagen-3.0-generate-002', supportedGenerationMethods: ['predict'] }, // 포함
            { name: 'models/empty-methods' }, // 제외
          ],
        }),
      } as any;
    }) as any;

    try {
      const models = await GeminiModelResolverService.fetchAvailableModels('test-secret-key');
      assert.deepStrictEqual(models, ['gemini-2.5-flash', 'imagen-3.0-generate-002']);
      assert.strictEqual(capturedHeaders['x-goog-api-key'], 'test-secret-key');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('21-13: ImageGeneratorService는 inlineData 응답 수신 시 Buffer 및 메타데이터를 올바르게 반환해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    const testBytes = Buffer.from('mock-binary-pixel-data');
    const mockBase64 = testBytes.toString('base64');

    globalThis.fetch = (async (url: any, init: any) => {
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: mockBase64,
                    },
                  },
                ],
              },
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      const res = await ImageGeneratorService.generateImage('test-key', 'A bushcraft shelter frame', {
        model: 'gemini-3-pro-image',
        aspectRatio: '16:9',
      });

      assert.strictEqual(res.mimeType, 'image/jpeg');
      assert.strictEqual(res.modelUsed, 'gemini-3-pro-image');
      assert.strictEqual(res.isAiGenerated, true);
      assert.deepStrictEqual(res.buffer, testBytes);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('21-14: ImageGeneratorService는 Imagen 3 모델 질의 시 :predict 엔드포인트와 규격을 맞춰야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl = '';
    const testBytes = Buffer.from('imagen-pixel-data');

    globalThis.fetch = (async (url: any, init: any) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          predictions: [
            {
              bytesBase64Encoded: testBytes.toString('base64'),
              mimeType: 'image/jpeg',
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      const res = await ImageGeneratorService.generateImage('test-key', 'Flint knife', {
        model: 'imagen-3.0-generate-002',
        aspectRatio: '1:1',
      });

      assert.ok(requestedUrl.includes(':predict'));
      assert.strictEqual(res.modelUsed, 'imagen-3.0-generate-002');
      assert.deepStrictEqual(res.buffer, testBytes);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('21-15: resolveModel은 12시간 TTL 동안 캐시를 유지하고 만료 시 재조회해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.8-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      } as any;
    }) as any;

    const originalNow = Date.now;
    let fakeNow = 10000000;
    Date.now = () => fakeNow;

    try {
      // 1. 최초 조회 -> fetch 1회 발생
      const m1 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(m1, 'gemini-2.8-flash');
      assert.strictEqual(fetchCount, 1);

      // 2. 1시간 경과 -> 캐시 히트, fetch 1회 유지
      fakeNow += 1 * 60 * 60 * 1000;
      const m2 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(m2, 'gemini-2.8-flash');
      assert.strictEqual(fetchCount, 1);

      // 3. 13시간 경과 (12시간 초과) -> 캐시 만료, fetch 2회차 발생
      fakeNow += 12 * 60 * 60 * 1000 + 10;
      const m3 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(m3, 'gemini-2.8-flash');
      assert.strictEqual(fetchCount, 2);
    } finally {
      Date.now = originalNow;
      globalThis.fetch = originalFetch;
    }
  });

  it('21-16: resolveModel은 병렬 동시 진입 시 Single-Flight로 중복 요청을 방지해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 10)); // 비동기 지연 시뮬레이션
      return {
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      } as any;
    }) as any;

    try {
      // 5개 동시 병렬 요청
      const results = await Promise.all([
        GeminiModelResolverService.resolveModel('key', 'flash'),
        GeminiModelResolverService.resolveModel('key', 'flash'),
        GeminiModelResolverService.resolveModel('key', 'flash'),
        GeminiModelResolverService.resolveModel('key', 'flash'),
        GeminiModelResolverService.resolveModel('key', 'flash'),
      ]);

      assert.strictEqual(results.every((r) => r === 'gemini-2.5-flash'), true);
      assert.strictEqual(fetchCount, 1); // 5개 병렬 호출에도 fetch는 정확히 1회만 실행
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('21-17: API 500 장애 시 안전 베이스라인으로 폴백하고 1분간 네거티브 캐시가 동작해야 한다', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = (async () => {
      fetchCount++;
      return {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as any;
    }) as any;

    const originalNow = Date.now;
    let fakeNow = 5000000;
    Date.now = () => fakeNow;

    try {
      // 1. 에러 발생 시 베이스라인 폴백 및 fetch 1회 발생
      const model1 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(model1, GeminiModelResolverService.BASELINE_MODELS.flash);
      assert.strictEqual(fetchCount, 1);

      // 2. 30초 후 재호출 -> 네거티브 캐시 유효로 fetch 미발생 (연속 5초 지연 방어)
      fakeNow += 30 * 1000;
      const model2 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(model2, GeminiModelResolverService.BASELINE_MODELS.flash);
      assert.strictEqual(fetchCount, 1);

      // 3. 70초 경과 (1분 초과) -> 네거티브 캐시 만료, 재시도 발생
      fakeNow += 40 * 1000;
      const model3 = await GeminiModelResolverService.resolveModel('valid-key', 'flash');
      assert.strictEqual(model3, GeminiModelResolverService.BASELINE_MODELS.flash);
      assert.strictEqual(fetchCount, 2);
    } finally {
      Date.now = originalNow;
      globalThis.fetch = originalFetch;
    }
  });

  it('21-18: callGeminiApi는 CoT 사고 과정을 배제하고 최종 응답을 추출하며 Safety Block 시 즉시 에러를 던져야 한다', async () => {
    const originalFetch = globalThis.fetch;

    // 1. CoT 추론 파트 테스트
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Internal thinking chain...', thought: true },
                  { text: '{"result":"success"}' },
                ],
              },
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      const output = await callGeminiApi('test-key', 'gemini-2.5-flash', 'Test prompt');
      assert.strictEqual(output, '{"result":"success"}');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 2. Safety 차단 테스트
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'SAFETY',
              content: { parts: [] },
            },
          ],
        }),
      } as any;
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await callGeminiApi('test-key', 'gemini-2.5-flash', 'Dangerous prompt');
        },
        {
          message: /Gemini API Safety Block/,
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
