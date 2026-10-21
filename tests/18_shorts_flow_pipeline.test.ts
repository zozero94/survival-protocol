import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShortsService } from '../src/services/shorts.service.ts';
import { TtsService } from '../src/services/tts.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';
import type { SupportedLocale } from '../src/i18n/locales.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mockProtocol: Protocol = {
  protocolId: 'PR-TEST',
  category: 'WATER',
  title: '간이 정수기 제작법',
  threatLevel: 'CRITICAL',
  threatLevelText: '[필수 생존]',
  summary: '모래와 숯으로 물을 정수합니다.',
  timeRequired: '25분',
  successRate: '99%',
  difficulty: '보통',
  materials: [
    { id: 'm1', name: '참나무 숯', desc: '여과제' },
    { id: 'm2', name: '고운 모래', desc: '여과제' },
    { id: 'm3', name: '자갈', desc: '받침' },
  ],
  steps: [
    {
      stepNumber: '01',
      title: '삼발이 조립 및 고깔 거치',
      description: '나뭇가지 3개로 삼발이를 세우고 고깔을 고정합니다.',
      actionNote: '> 주의: 마개를 단단히 채우세요.',
      svgFileName: 'pr01-step-01.svg',
    },
    {
      stepNumber: '02',
      title: '숯과 모래 적층',
      description: '숯을 8cm 채우고 모래를 6cm 붓습니다.',
      actionNote: '> 입자 크기를 고르게 하세요.',
      svgFileName: 'pr01-step-02.svg',
    },
    {
      stepNumber: '03',
      title: '물 붓기 및 여과',
      description: '흙탕물을 천천히 부어 여과합니다.',
      actionNote: '> 첫 2잔은 버리세요.',
      svgFileName: 'pr01-step-03.svg',
    },
  ],
  fatalMistake: {
    title: '끓이지 않고 마시는 행위',
    description: '걸러낸 물을 끓이지 않고 마시면 기생충으로 탈이 납니다.',
    consequence: '심각한 장염 및 탈수',
  },
  shortsScript: {
    hook: '흙탕물을 마시면 사흘 안에 쓰러집니다! 자연 정수기 만드는 법!',
    body: '삼발이를 세우고 숯과 모래를 층층이 채운 뒤 물을 붓습니다. 투명해도 반드시 3분 끓여야 안전합니다!',
    outro: '오프라인 도면은 프로필 링크에서 확인하세요.',
  },
  outcome: {
    title: '정수기 완성',
    description: '맑은 물 추출 완료',
    svgFileName: 'pr01-outcome.svg',
  },
};

const mockEnProtocol: Protocol = {
  ...mockProtocol,
  title: 'How to Build a Natural Water Filter',
  steps: [
    {
      stepNumber: '01',
      title: 'Step 1: Assemble tripod and cone',
      description: 'Lash three branches and suspend the bark cone.',
      actionNote: '> Plug firmly.',
      svgFileName: 'pr01-step-01.svg',
    },
    {
      stepNumber: '02',
      title: 'Step 2: Layer charcoal and sand',
      description: 'Pour 8cm of charcoal and 6cm of river sand.',
      actionNote: '> Keep grain uniform.',
      svgFileName: 'pr01-step-02.svg',
    },
    {
      stepNumber: '03',
      title: 'Step 3: Pour muddy water',
      description: 'Pour muddy water slowly through the column.',
      actionNote: '> Discard first 2 cups.',
      svgFileName: 'pr01-step-03.svg',
    },
  ],
  fatalMistake: {
    title: 'Drinking filtered water without boiling',
    description: 'Parasites pass through primitive filters. Boil vigorously.',
    consequence: 'Lethal dehydration',
  },
  shortsScript: {
    hook: 'Drinking wild muddy water will cause lethal diarrhea! Here is how to purify it!',
    body: 'Lash a tripod, layer charcoal and sand, and filter. Crucial rule: Always boil for 3+ minutes!',
    outro: 'Access full offline survival blueprints via the profile link.',
  },
};

test('Shorts Suite 18-1: buildGoogleFlowPackage 7대 씬 & 45초 9:16 규격 검증', () => {
  const flowPkg = ShortsService.buildGoogleFlowPackage(mockProtocol, mockEnProtocol);

  assert.equal(flowPkg.protocolId, 'PR-TEST');
  assert.equal(flowPkg.aspectRatio, '9:16');
  assert.equal(flowPkg.totalDurationSeconds, 45);
  assert.equal(flowPkg.scenes.length, 7, '씬은 정확히 7개여야 합니다.');

  // 지속 시간 합계 검증
  const totalDuration = flowPkg.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
  assert.equal(totalDuration, 45, '씬 지속 시간 합계는 45초여야 합니다.');

  // 구글 플로우(Veo) 프롬프트 7대 차원 필수 요소 검증
  flowPkg.scenes.forEach((scene) => {
    assert.ok(scene.flowPrompt.startsWith('Vertical 9:16'), '모든 프롬프트는 Vertical 9:16으로 시작해야 합니다.');
    assert.match(scene.flowPrompt, /\(no subtitles\)/, '모든 비주얼 프롬프트는 (no subtitles)를 포함해야 합니다.');
    assert.match(scene.flowPrompt, /Audio:/, '모든 프롬프트는 오디오 폴리 사운드 지시를 포함해야 합니다.');
    assert.match(scene.flowPrompt, /Background music:/, '모든 프롬프트는 배경음악 지시를 포함해야 합니다.');
    assert.ok(scene.referencePlate, '각 씬은 참조 도면/이미지 파일명을 가져야 합니다.');
  });
});

test('Shorts Suite 18-2: buildLocalizedScriptAndSrt 타임스탬프 및 SRT 자막 무결성 검증', () => {
  const flowPkg = ShortsService.buildGoogleFlowPackage(mockProtocol);
  const localized = ShortsService.buildLocalizedScriptAndSrt(mockProtocol, flowPkg);

  assert.equal(localized.scenesText.length, 7);
  assert.ok(localized.fullScriptText.length > 50, '전체 대본 텍스트가 비어있지 않아야 합니다.');

  // SRT 자막 파싱 및 타임스탬프 순차성 검증
  const srt = localized.srtContent;
  assert.match(srt, /00:00:00,000 --> 00:00:05,000/, 'Scene 1 타임스탬프 검증');
  assert.match(srt, /00:00:05,000 --> 00:00:10,000/, 'Scene 2 타임스탬프 검증');
  assert.match(srt, /00:00:42,000 --> 00:00:45,000/, 'Scene 7 타임스탬프 검증');
});

test('Shorts Suite 18-3: generateShortsPackage 1소스 7다국어 OSMU 패키지 파일 시스템 생성 검증', async () => {
  const testOutputDir = path.join(rootDir, 'shorts/__test_shorts_output__');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  const localesMap: Record<SupportedLocale, Protocol> = {
    ko: mockProtocol,
    en: mockEnProtocol,
    ja: mockProtocol,
    es: mockProtocol,
    de: mockProtocol,
    pt: mockProtocol,
    'zh-TW': mockProtocol,
  };

  const result = await ShortsService.generateShortsPackage(
    mockProtocol,
    testOutputDir,
    localesMap,
    'PR-TEST-pilot'
  );

  const targetDir = path.join(testOutputDir, 'PR-TEST-pilot');
  assert.ok(fs.existsSync(targetDir), '타겟 쇼츠 폴더가 생성되어야 합니다.');

  // 1. common-veo-prompts.json 검증
  const promptJsonPath = path.join(targetDir, 'common-veo-prompts.json');
  assert.ok(fs.existsSync(promptJsonPath), 'common-veo-prompts.json이 존재해야 합니다.');
  const parsedPrompts = JSON.parse(fs.readFileSync(promptJsonPath, 'utf-8'));
  assert.equal(parsedPrompts.scenes.length, 7);

  // 2. flow-storyboard.md 검증
  const storyboardPath = path.join(targetDir, 'flow-storyboard.md');
  assert.ok(fs.existsSync(storyboardPath), 'flow-storyboard.md가 존재해야 합니다.');
  const mdContent = fs.readFileSync(storyboardPath, 'utf-8');
  assert.match(mdContent, /# 🎬 \[Google Flow \/ Veo\]/);

  // 3. 7개 언어 폴더 및 대본/자막 파일 검증
  const locales = ['ko', 'en', 'ja', 'es', 'de', 'pt', 'zh-TW'] as const;
  for (const loc of locales) {
    const locFolder = path.join(targetDir, 'locales', loc);
    assert.ok(fs.existsSync(locFolder), `로케일 [${loc}] 폴더가 존재해야 합니다.`);
    assert.ok(fs.existsSync(path.join(locFolder, 'script.txt')), `[${loc}] script.txt가 존재해야 합니다.`);
    assert.ok(fs.existsSync(path.join(locFolder, 'subtitles.srt')), `[${loc}] subtitles.srt가 존재해야 합니다.`);
  }

  // 4. plates 폴더 검증
  const platesDir = path.join(targetDir, 'plates');
  assert.ok(fs.existsSync(platesDir), 'plates 폴더가 생성되어야 합니다.');

  // 임시 테스트 폴더 정리
  fs.rmSync(testOutputDir, { recursive: true, force: true });
});

test('Shorts Suite 18-4: TtsService 스마트 캐싱 검증', async () => {
  const tmpDir = path.join(rootDir, 'shorts/__test_tts_cache__');
  fs.mkdirSync(tmpDir, { recursive: true });

  const testAudioPath = path.join(tmpDir, 'test.wav');
  const dummyAudio = Buffer.alloc(1500, 0x55);
  fs.writeFileSync(testAudioPath, dummyAudio);

  const text = '생존을 위한 테스트 음성입니다.';
  const hash = TtsService['computeHash'](text);
  fs.writeFileSync(`${testAudioPath}.hash`, hash, 'utf-8');

  // 동일한 텍스트로 합성 요청 시 API 호출 없이 캐시 히트 검증
  const result = await TtsService.synthesizeSpeech(text, testAudioPath, 'ko');
  assert.equal(result.success, true);
  assert.equal(result.cached, true, '해시가 일치하면 스마트 캐시가 작동해야 합니다.');

  // 정리
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
