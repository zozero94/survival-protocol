import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SvgAuditService, type SvgStepContext } from '../src/services/svg-audit.service.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sampleContext: SvgStepContext = {
  topicTitle: '프로토콜 #02: 보우 드릴 마찰열 발화법',
  stepNumber: '01',
  stepTitle: 'V자 홈 가공 및 스핀들 축 셋업',
  actionDescription: '받침 판재 가장자리에서 중심부까지 45도 V자 홈을 파내고 스핀들 축을 수직 안착시킨다.',
  actionNote: '홈의 꼭짓점은 스핀들 중심과 정확히 접촉해야 한다.',
};

const validSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="660" height="320" fill="none" stroke="#262626"/>
  <polygon points="120,180 520,180 480,230 80,230" fill="#1f1e1e" stroke="#888888"/>
  <ellipse cx="300" cy="205" rx="26" ry="12" fill="#0d0d0d" stroke="#E5E5E5"/>
  <polygon points="300,205 260,230 340,230" fill="#0d0d0d" stroke="#E02424"/>
  <line x1="160" y1="155" x2="295" y2="203" stroke="#AAAAAA"/>
  <text x="300" y="100" fill="#E02424" font-size="10" text-anchor="middle">45° V-NOTCH (홈의 꼭짓점)</text>
  <text x="130" y="215" fill="#AAAAAA" font-size="10">HEARTH BOARD (받침 판재)</text>
</svg>`;

describe('🔬 [Suite 10: 벡터 도면 검수 에이전트 & 무한루프 방지 검증]', () => {
  it('정상 규격의 SVG 도면과 실제 발행된 전 가이드 도면 64종(스텝 52종 + 완성 결과물 12종) 모두 정적 검수(100점)를 통과해야 한다', () => {
    const report = SvgAuditService.auditSvgStatic(validSvg, sampleContext);
    assert.strictEqual(report.passed, true);
    assert.strictEqual(report.score, 100);
    assert.strictEqual(report.issues.length, 0);

    // 최종 발행된 전 가이드 도면 64종(스텝 52종 + 완성 결과물 12종) 모두 정적 검수(100점)를 통과해야 한다
    const activeSvgs = [
      'step-01.svg',
      'step-02.svg',
      'step-03.svg',
      'pr01-step-01.svg',
      'pr01-step-02.svg',
      'pr01-step-03.svg',
      'pr01-step-04.svg',
      'pr01-step-05.svg',
      '02-step-01.svg',
      '02-step-02.svg',
      '02-step-03.svg',
      'pr03-step-01.svg',
      'pr03-step-02.svg',
      'pr03-step-03.svg',
      'pr04-step-01.svg',
      'pr04-step-02.svg',
      'pr04-step-03.svg',
      'pr05-step-01.svg',
      'pr05-step-02.svg',
      'pr05-step-03.svg',
      'pr05-step-04.svg',
      'pr05-step-05.svg',
      'pr06-step-01.svg',
      'pr06-step-02.svg',
      'pr06-step-03.svg',
      'pr06-step-04.svg',
      'pr06-step-05.svg',
      'pr07-step-01.svg',
      'pr07-step-02.svg',
      'pr07-step-03.svg',
      'pr07-step-04.svg',
      'pr07-step-05.svg',
      'pr08-step-01.svg',
      'pr08-step-02.svg',
      'pr08-step-03.svg',
      'pr08-step-04.svg',
      'pr09-step-01.svg',
      'pr09-step-02.svg',
      'pr09-step-03.svg',
      'pr09-step-04.svg',
      'pr10-step-01.svg',
      'pr10-step-02.svg',
      'pr10-step-03.svg',
      'pr10-step-04.svg',
      'pr11-step-01.svg',
      'pr11-step-02.svg',
      'pr11-step-03.svg',
      'pr11-step-04.svg',
      'pr12-step-01.svg',
      'pr12-step-02.svg',
      'pr12-step-03.svg',
      'pr12-step-04.svg',
      'pr13-step-01.svg',
      'pr13-step-02.svg',
      'pr13-step-03.svg',
      'pr13-step-04.svg',
      'pr14-step-01.svg',
      'pr14-step-02.svg',
      'pr14-step-03.svg',
      'pr14-step-04.svg',
      'pr15-step-01.svg',
      'pr15-step-02.svg',
      'pr15-step-03.svg',
      'pr15-step-04.svg',
      'pr16-step-01.svg',
      'pr16-step-02.svg',
      'pr16-step-03.svg',
      'pr16-step-04.svg',
      // 최종 완성 결과물 초고화질 벡터 도면 16종
      'pr01-outcome.svg',
      'pr02-outcome.svg',
      'pr03-outcome.svg',
      'pr04-outcome.svg',
      'pr05-outcome.svg',
      'pr06-outcome.svg',
      'pr07-outcome.svg',
      'pr08-outcome.svg',
      'pr09-outcome.svg',
      'pr10-outcome.svg',
      'pr11-outcome.svg',
      'pr12-outcome.svg',
      'pr13-outcome.svg',
      'pr14-outcome.svg',
      'pr15-outcome.svg',
      'pr16-outcome.svg',
    ];

    for (const fileName of activeSvgs) {
      const svgContent = fs.readFileSync(path.join(rootDir, 'content/svgs', fileName), 'utf-8');
      const r = SvgAuditService.auditSvgStatic(svgContent, sampleContext);
      assert.strictEqual(r.passed, true, `${fileName} 검수 실패: ${JSON.stringify(r.issues)}`);
      assert.strictEqual(r.score, 100, `${fileName} 점수가 100점이 아님: ${r.score}`);
    }
  });

  it('문구끼리 겹치거나(TEXT_OVERLAP), 경계를 벗어나거나(BOUNDARY_CLIP), 깨진 문구(TEXT_CORRUPTION)를 정확히 감지해야 한다', () => {
    const buggySvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="660" height="320" fill="none" stroke="#262626"/>
      <circle cx="300" cy="200" r="20" stroke="#fff"/>
      <line x1="100" y1="100" x2="200" y2="200" stroke="#fff"/>
      <!-- 1. 동일한 위치에 겹친 두 텍스트 -->
      <text x="200" y="150" font-size="12">SPINDLE AXIS (스핀들 회전축)</text>
      <text x="205" y="152" font-size="12">HEARTH BOARD (받침 판재)</text>
      <!-- 2. viewBox 바깥으로 나간 텍스트 -->
      <text x="720" y="360" font-size="10">OUT OF BOUNDS LABEL</text>
      <!-- 3. 닫히지 않은 괄호 및 현대 공산품 금지어 -->
      <text x="100" y="250" font-size="10">플라스틱 파이프 (깨진 괄호</text>
    </svg>`;

    const report = SvgAuditService.auditSvgStatic(buggySvg, sampleContext);
    assert.strictEqual(report.passed, false);
    assert.ok(report.issues.some((i) => i.category === 'TEXT_OVERLAP'));
    assert.ok(report.issues.some((i) => i.category === 'BOUNDARY_CLIP'));
    assert.ok(report.issues.some((i) => i.category === 'TEXT_CORRUPTION'));
    assert.ok(report.remediationPrompt.includes('TEXT_OVERLAP'));
  });

  it('불투명 다각형(바위 등)이 지지대 기둥의 중간을 가로질러 관통하는 기하학적 관통(Piercing) 결함을 정확히 감지해야 한다', () => {
    const piercingSvg = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="380" height="380" fill="none"/>
      <!-- 수직 지지대 기둥 (x=135, y=165 to 310) -->
      <rect x="135" y="165" width="16" height="145" fill="#78350f"/>
      <!-- 기둥 뒤에 그려져 몸통 중간(y=220~250)을 가로질러 덮어버리는 불투명 바위 다각형 -->
      <polygon points="50,220 250,220 250,250 50,250" fill="#475569"/>
      <text x="135" y="100" font-size="10">PIERCING TEST</text>
    </svg>`;

    const report = SvgAuditService.auditSvgStatic(piercingSvg, sampleContext);
    assert.strictEqual(report.passed, false);
    assert.ok(report.issues.some((i) => i.reason.includes('기하학적 관통(Piercing) 결함')));
    assert.ok(report.issues.some((i) => i.category === 'CONTENT_MISMATCH'));
  });

  it('[Fail -> Remediation -> Pass] 1차 추출에서 결함 발견 시 교정 프롬프트를 전달하여 2차 재추출에서 통과해야 한다', async () => {
    const receivedPrompts: Array<string | undefined> = [];

    const loopResult = await SvgAuditService.extractAndVerifyLoop({
      context: sampleContext,
      maxAttempts: 3,
      extractFn: async (attempt, remediationPrompt) => {
        receivedPrompts.push(remediationPrompt);
        if (attempt === 1) {
          // 1차 시도: 텍스트 겹침 결함이 있는 SVG 반환
          return `<svg viewBox="0 0 680 340">
            <rect x="10" y="10" width="660" height="320"/><circle cx="50" cy="50" r="10"/><line x1="0" y1="0" x2="10" y2="10"/>
            <text x="100" y="100" font-size="12">OVERLAP LABEL ONE</text>
            <text x="102" y="101" font-size="12">OVERLAP LABEL TWO</text>
          </svg>`;
        }
        // 2차 시도: 교정 프롬프트 수신 후 정상 SVG 반환
        return validSvg;
      },
    });

    assert.strictEqual(loopResult.attemptsUsed, 2);
    assert.strictEqual(loopResult.terminationReason, 'PASSED');
    assert.strictEqual(loopResult.finalReport.passed, true);
    assert.strictEqual(receivedPrompts[0], undefined);
    assert.ok(receivedPrompts[1]?.includes('TEXT_OVERLAP'), '2차 재추출 시 1차 결함 교정 지침이 전달되어야 함');
  });

  it('[무한루프 방지 Guard 1: Hard Cap] maxAttempts에 999999나 Infinity를 전달하고 매번 실패해도 절대 3회를 초과하지 않고 즉시 종료되어야 한다', async () => {
    let callCount = 0;

    const loopResult = await SvgAuditService.extractAndVerifyLoop({
      context: sampleContext,
      maxAttempts: 999999, // 비정상적인 거대 루프 요청
      extractFn: async (attempt) => {
        callCount++;
        // 매번 해시와 결함 요소가 달라지지만 계속 실패하는 도면 생성
        return `<svg viewBox="0 0 680 340">
          <rect x="10" y="10" width="${attempt * 10}" height="10"/>
          <text x="100" y="100" font-size="10">플라스틱 금지어_${attempt}</text>
        </svg>`;
      },
    });

    assert.strictEqual(callCount, SvgAuditService.HARD_MAX_ATTEMPTS, '정확히 HARD_MAX_ATTEMPTS(3회)에서 강제 종료되어야 함');
    assert.strictEqual(loopResult.attemptsUsed, 3);
    assert.strictEqual(loopResult.terminationReason, 'MAX_ATTEMPTS_REACHED');
  });

  it('[무한루프 방지 Guard 2: Stagnation 감지] 재추출기가 이전과 동일한 SVG를 다시 반환하면 남은 횟수를 소모하지 않고 즉시 조기 탈출해야 한다', async () => {
    let callCount = 0;
    const identicalBadSvg = `<svg viewBox="0 0 680 340">
      <rect x="10" y="10" width="100" height="100"/>
      <text x="50" y="50">라이터 사용 금지</text>
    </svg>`;

    const loopResult = await SvgAuditService.extractAndVerifyLoop({
      context: sampleContext,
      maxAttempts: 3,
      extractFn: async () => {
        callCount++;
        return identicalBadSvg;
      },
    });

    assert.strictEqual(callCount, 2, '2회차에 동일 SVG가 감지되면 3회차를 실행하지 않고 즉시 중단해야 함');
    assert.strictEqual(loopResult.terminationReason, 'STAGNATION_DETECTED');
  });

  it('[무한루프 방지 Guard 3: 동일 결함 시그니처 감지] SVG 공백/주석만 바뀌고 동일한 결함이 반복되면 즉시 조기 탈출해야 한다', async () => {
    let callCount = 0;

    const loopResult = await SvgAuditService.extractAndVerifyLoop({
      context: sampleContext,
      maxAttempts: 3,
      extractFn: async (attempt) => {
        callCount++;
        // 주석이 달라져 SVG 해시는 다르지만, 결함(플라스틱 금지어 텍스트)은 100% 동일한 경우
        return `<svg viewBox="0 0 680 340">
          <!-- attempt ${attempt} -->
          <rect x="10" y="10" width="100" height="100"/><circle cx="20" cy="20" r="5"/><line x1="1" y1="1" x2="5" y2="5"/>
          <text x="50" y="50">플라스틱 용기</text>
        </svg>`;
      },
    });

    assert.strictEqual(callCount, 2, '동일 결함 시그니처 반복 시 2회차에서 즉시 조기 종료되어야 함');
    assert.strictEqual(loopResult.terminationReason, 'DUPLICATE_ISSUES_EARLY_EXIT');
  });

  it('[무한루프 방지 Guard 4: Auto-Fix & Best Candidate] 정적 좌표 이탈/겹침 결함은 autoFixStaticIssues를 통해 안전 영역으로 자동 교정되어야 한다', () => {
    const outOfBoundsAndOverlapSvg = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="660" height="320" fill="none" stroke="#262626"/>
      <circle cx="300" cy="200" r="20" stroke="#fff"/>
      <line x1="100" y1="100" x2="200" y2="200" stroke="#fff"/>
      <text x="150" y="100" font-size="10">FIRST LABEL</text>
      <text x="152" y="101" font-size="10">SECOND OVERLAPPING LABEL</text>
      <text x="750" y="390" font-size="10">CLIPPED LABEL</text>
    </svg>`;

    const beforeReport = SvgAuditService.auditSvgStatic(outOfBoundsAndOverlapSvg);
    assert.strictEqual(beforeReport.passed, false);

    const fixedSvg = SvgAuditService.autoFixStaticIssues(outOfBoundsAndOverlapSvg);
    const afterReport = SvgAuditService.auditSvgStatic(fixedSvg);
    assert.strictEqual(afterReport.passed, true, `자동 보정 후 통과 실패: ${JSON.stringify(afterReport.issues)}`);
    assert.strictEqual(afterReport.score, 100);
  });

  it('[무한루프 방지 Guard 5: Circuit Breaker] 추출기에서 예외가 발생하면 무한 재시도 없이 즉시 안전하게 루프를 탈출해야 한다', async () => {
    let callCount = 0;
    const loopResult = await SvgAuditService.extractAndVerifyLoop({
      context: sampleContext,
      maxAttempts: 3,
      extractFn: async () => {
        callCount++;
        throw new Error('Network disconnected');
      },
    });

    assert.strictEqual(callCount, 1);
    assert.strictEqual(loopResult.terminationReason, 'CIRCUIT_BREAKER_TRIPPED');
  });

  it('[7개국어 도면 핫스왑 & 정적 감사] 7개 지원 언어(ko, en, ja, es, de, pt, zh-TW) 전체에 대해 SVG <text> 라벨 개수 일치 및 경계/충돌 무결성을 100% 통과해야 한다', () => {
    const locales = ['en', 'ja', 'es', 'de', 'pt', 'zh-TW'];
    const baseSlugs = [
      '01-water-purification',
      '02-friction-fire',
      '03-프로토콜-03-데브리-헛-debris-hut-a프레임-단열-은신처-구축법',
      '08-figure-four-deadfall',
    ];
    const protocolsDir = path.resolve(__dirname, '../content/protocols');
    const localesDir = path.resolve(__dirname, '../content/protocols/locales');
    const svgsDir = path.resolve(__dirname, '../content/svgs');

    for (const slug of baseSlugs) {
      const koProto = JSON.parse(fs.readFileSync(path.join(protocolsDir, `${slug}.json`), 'utf-8'));

      for (let sIdx = 0; sIdx < koProto.steps.length; sIdx++) {
        const step = koProto.steps[sIdx];
        const svgCode = fs.readFileSync(path.join(svgsDir, step.svgFileName), 'utf-8');
        const extractedLabels = SvgAuditService.extractSvgTextLabels(svgCode);

        assert.ok(Array.isArray(step.svgLabels), `${slug} ko step ${sIdx} svgLabels 누락`);
        assert.strictEqual(
          step.svgLabels.length,
          extractedLabels.length,
          `${slug} ko step ${sIdx} svgLabels 개수 불일치`
        );

        // 선언적 바인딩 주입 검증
        const boundSvg = SvgAuditService.bindSvgDeclarativeLabels(svgCode, sIdx);
        assert.ok(boundSvg.includes(`data-svg-step="${sIdx}"`), 'data-svg-step 속성 누락');
        assert.ok(boundSvg.includes(`data-svg-label="${extractedLabels.length - 1}"`), 'data-svg-label 속성 누락');

        const labelsByLocale: Record<string, string[]> = { ko: step.svgLabels };

        for (const lang of locales) {
          const locFile = path.join(localesDir, `${slug}.${lang}.json`);
          assert.ok(fs.existsSync(locFile), `다국어 파일 누락: ${locFile}`);
          const locProto = JSON.parse(fs.readFileSync(locFile, 'utf-8'));
          const locStep = locProto.steps[sIdx];
          assert.ok(Array.isArray(locStep.svgLabels), `${slug}.${lang} step ${sIdx} svgLabels 누락`);
          assert.strictEqual(
            locStep.svgLabels.length,
            extractedLabels.length,
            `${slug}.${lang} step ${sIdx} svgLabels 개수(${locStep.svgLabels.length})가 SVG <text> 개수(${extractedLabels.length})와 다름`
          );
          labelsByLocale[lang] = locStep.svgLabels;
        }

        // 7개국어 전체 라벨을 대입하여 겹침/잘림 정적 감사 수행
        const multiAudit = SvgAuditService.auditMultilingualLabels(svgCode, labelsByLocale);
        assert.strictEqual(
          multiAudit.allPassed,
          true,
          `${step.svgFileName} 다국어 정적 감사 실패: ${JSON.stringify(multiAudit.localeReports)}`
        );
      }
    }
  });
});

