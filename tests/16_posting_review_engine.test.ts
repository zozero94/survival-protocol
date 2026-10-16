import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PostingReviewService } from '../src/services/posting-review.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

const PROTOCOLS_DIR = path.resolve(process.cwd(), 'content', 'protocols');
const LOCALES_DIR = path.join(PROTOCOLS_DIR, 'locales');

test('Suite 16: PostingReviewService - 4-Pillar Posting Quality Audit (Safety, Field Reproducibility, SEO, Global Eco-Localization)', async (t) => {
  const masterFiles = fs
    .readdirSync(PROTOCOLS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .sort();

  await t.test('16-1: 전 발행 프로토콜(PR-01 ~ PR-10)이 4대 포스팅 품질 심사(Safety, Reproducibility, SEO, Localization)를 100% 통과해야 한다', () => {
    assert.ok(masterFiles.length >= 9, '최소 9개 이상의 활성 마스터 프로토콜이 존재해야 함');

    for (const file of masterFiles) {
      const slugBase = file.replace(/\.json$/, '');
      const masterProtocol = JSON.parse(fs.readFileSync(path.join(PROTOCOLS_DIR, file), 'utf-8')) as Protocol;

      const localizedVariants: Record<string, Protocol> = {};
      for (const lang of ['en', 'ja', 'es', 'de', 'pt', 'zh-TW']) {
        const locPath = path.join(LOCALES_DIR, `${slugBase}.${lang}.json`);
        if (fs.existsSync(locPath)) {
          localizedVariants[lang] = JSON.parse(fs.readFileSync(locPath, 'utf-8')) as Protocol;
        }
      }

      const report = PostingReviewService.auditPostingFull(masterProtocol, localizedVariants);

      assert.equal(
        report.passed,
        true,
        `[${masterProtocol.protocolId}] 4대 포스팅 리뷰 통과 실패 (점수: ${report.totalScore}): ${report.summaryFeedback.join(' / ')}`
      );
      assert.ok(report.totalScore >= 85, `[${masterProtocol.protocolId}] 종합 점수 85점 이상이어야 함 (실제: ${report.totalScore})`);
    }
  });

  await t.test('16-2: 현대 정밀 계측기(전자저울, 디지털 온도계, 타이머) 의존 문구가 포함되면 FIELD_REPRODUCIBILITY 감점이 작동해야 한다', () => {
    const sample = JSON.parse(
      fs.readFileSync(path.join(PROTOCOLS_DIR, masterFiles[0]!), 'utf-8')
    ) as Protocol;

    const contaminated: Protocol = {
      ...sample,
      steps: sample.steps.map((s, idx) =>
        idx === 0
          ? { ...s, description: `${s.description} 전자저울로 50g을 정확히 계량하고 타이머를 맞추어 10분간 가열합니다.` }
          : s
      ),
    };

    const res = PostingReviewService.auditFieldReproducibility(contaminated);
    assert.equal(res.passed, false, '현대 정밀 계측기 사용 시 무도구 재현성 심사를 통과하면 안 됨');
    assert.ok(res.warnings.length >= 2, '금지 계측기 경고가 최소 2건 이상 기록되어야 함');
  });

  await t.test('16-3: 번역본에 미번역 한글이 남아있을 경우 GLOBAL_ECO_LOCALIZATION 경고가 즉시 포착되어야 한다', () => {
    const sample = JSON.parse(
      fs.readFileSync(path.join(PROTOCOLS_DIR, masterFiles[0]!), 'utf-8')
    ) as Protocol;

    const brokenEn: Protocol = {
      ...sample,
      title: 'How to Purify Water with 숯과 모래',
    };

    const res = PostingReviewService.auditGlobalEcoLocalization(sample, {
      en: brokenEn,
      ja: brokenEn,
      es: brokenEn,
      de: brokenEn,
      pt: brokenEn,
      'zh-TW': brokenEn,
    });

    assert.equal(res.passed, false, '미번역 한글 포함 시 다국어 현지화 심사를 통과하면 안 됨');
    assert.ok(res.warnings.some((w) => w.includes('미번역 한글')), '미번역 한글 경고 메시지가 포함되어야 함');
  });
});
