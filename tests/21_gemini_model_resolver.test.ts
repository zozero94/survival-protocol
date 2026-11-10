import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { GeminiModelResolverService } from '../src/services/gemini-model-resolver.service.ts';
import { ImageGeneratorService } from '../src/services/image-generator.service.ts';

describe('🤖 [Suite 21: 제미나이 및 이미지 모델 동적 자동 리졸버 검증]', () => {
  beforeEach(() => {
    GeminiModelResolverService.clearCache();
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FLASH_MODEL;
    delete process.env.GEMINI_PRO_MODEL;
    delete process.env.GEMINI_IMAGE_MODEL;
    delete process.env.GEMINI_TTS_MODEL;
  });

  afterEach(() => {
    GeminiModelResolverService.clearCache();
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FLASH_MODEL;
    delete process.env.GEMINI_PRO_MODEL;
    delete process.env.GEMINI_IMAGE_MODEL;
    delete process.env.GEMINI_TTS_MODEL;
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
});
