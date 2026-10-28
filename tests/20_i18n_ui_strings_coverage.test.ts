import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../src/i18n/locales.ts';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const ALL_LOCALES = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[];
const NON_KO_LOCALES = ALL_LOCALES.filter((l) => l !== 'ko');

test('🌐 [Suite 20: UI 다국어 사전(UI_STRINGS) 및 data-i18n 커버리지 전수 감사]', async (t) => {
  await t.test('20-1: public/*.html에 존재하는 모든 data-i18n 및 data-i18n-placeholder 키가 7개 전 언어 UI_STRINGS에 100% 정의되어야 한다', () => {
    const htmlFiles = fs.readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.html'));
    assert.ok(htmlFiles.length > 0, '검사할 HTML 파일이 public/에 존재해야 함');

    const usedKeys = new Set<string>();

    for (const fileName of htmlFiles) {
      const html = fs.readFileSync(path.join(PUBLIC_DIR, fileName), 'utf-8');
      const i18nMatches = html.matchAll(/data-i18n="([^"]+)"/g);
      for (const m of i18nMatches) {
        usedKeys.add(m[1]);
      }
      const placeholderMatches = html.matchAll(/data-i18n-placeholder="([^"]+)"/g);
      for (const m of placeholderMatches) {
        usedKeys.add(m[1]);
      }
    }

    assert.ok(usedKeys.size >= 40, `최소 40개 이상의 data-i18n 키가 수집되어야 함 (실제: ${usedKeys.size})`);

    for (const key of usedKeys) {
      for (const locale of ALL_LOCALES) {
        const val = (UI_STRINGS[locale] as Record<string, string>)[key];
        assert.ok(
          val !== undefined,
          `[누락된 UI 번역 키] 언어 '${locale}'에서 data-i18n 키 '${key}'가 정의되지 않았습니다.`
        );
        if (key !== 'paginationTotalSuffix') {
          assert.ok(
            val.trim().length > 0,
            `[빈 UI 번역 값] 언어 '${locale}'에서 data-i18n 키 '${key}'가 빈 문자열입니다.`
          );
        }
      }
    }
  });

  await t.test('20-2: UI_STRINGS.ko에 선언된 모든 키가 7개 언어 전체에 1:1로 완전 동기화되어 있어야 한다', () => {
    const koKeys = Object.keys(UI_STRINGS.ko);
    for (const locale of ALL_LOCALES) {
      const targetKeys = Object.keys(UI_STRINGS[locale]);
      const missingKeys = koKeys.filter((k) => !(k in UI_STRINGS[locale]));
      assert.deepEqual(
        missingKeys,
        [],
        `[${locale}] ko 사전에 존재하는 키가 누락되었습니다: ${missingKeys.join(', ')}`
      );
      assert.equal(
        targetKeys.length,
        koKeys.length,
        `[${locale}] 총 키 개수가 ko(${koKeys.length}개)와 일치해야 합니다 (실제: ${targetKeys.length}개)`
      );
    }
  });

  await t.test('20-3: 한국어(ko)를 제외한 6대 언어(en, ja, es, de, pt, zh-TW)의 UI_STRINGS 값에 미번역 한글이 0건이어야 한다', () => {
    const koreanCharRegex = /[가-힣]/;
    for (const locale of NON_KO_LOCALES) {
      const dict = UI_STRINGS[locale] as Record<string, string>;
      for (const [key, value] of Object.entries(dict)) {
        assert.equal(
          koreanCharRegex.test(value),
          false,
          `[${locale}] '${key}'에 미번역 한글이 포함되어 있습니다: "${value}"`
        );
      }
    }
  });

  await t.test('20-4: index.html에 언어 전환 핫스왑을 시뮬레이션했을 때 data-i18n 노드에 한글이 일체 잔존하지 않아야 한다', () => {
    const indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    const koreanCharRegex = /[가-힣]/;

    for (const locale of NON_KO_LOCALES) {
      const dict = UI_STRINGS[locale] as Record<string, string>;
      let simulated = indexHtml.replace(/<([a-zA-Z0-9-]+)([^>]*?data-i18n="([^"]+)"[^>]*?)>([^<]*?)<\/\1>/gi, (_full, tag, attrs, key, _text) => {
        const replacement = dict[key] || '';
        return `<${tag}${attrs}>${replacement}</${tag}>`;
      });

      // data-i18n 태그 내 한글 잔존 여부 검사
      const remainingKoreanTags: string[] = [];
      const matchRegex = /<([a-zA-Z0-9-]+)([^>]*?data-i18n="([^"]+)"[^>]*?)>([^<]*?)<\/\1>/gi;
      let m;
      while ((m = matchRegex.exec(simulated)) !== null) {
        if (koreanCharRegex.test(m[4])) {
          remainingKoreanTags.push(`[${m[3]}] ${m[4].trim()}`);
        }
      }

      assert.deepEqual(
        remainingKoreanTags,
        [],
        `[${locale}] index.html 핫스왑 후 data-i18n 요소에 미번역 한글이 잔존합니다: ${remainingKoreanTags.join(', ')}`
      );
    }
  });

  await t.test('20-5: 푸터 5대 카테고리(footerCat1~5)가 최신 분류 규격([01 FOOD] ~ [05 MEDICINE])과 일치해야 한다', () => {
    for (const locale of ALL_LOCALES) {
      const dict = UI_STRINGS[locale];
      assert.ok(dict.footerCat1.startsWith('[01 FOOD]'), `[${locale}] footerCat1은 [01 FOOD]로 시작해야 함 (실제: ${dict.footerCat1})`);
      assert.ok(dict.footerCat2.startsWith('[02 SHELTER]'), `[${locale}] footerCat2는 [02 SHELTER]로 시작해야 함 (실제: ${dict.footerCat2})`);
      assert.ok(dict.footerCat3.startsWith('[03 TOOLS]'), `[${locale}] footerCat3는 [03 TOOLS]로 시작해야 함 (실제: ${dict.footerCat3})`);
      assert.ok(dict.footerCat4.startsWith('[04 MATERIALS]'), `[${locale}] footerCat4는 [04 MATERIALS]로 시작해야 함 (실제: ${dict.footerCat4})`);
      assert.ok(dict.footerCat5.startsWith('[05 MEDICINE]'), `[${locale}] footerCat5는 [05 MEDICINE]로 시작해야 함 (실제: ${dict.footerCat5})`);
    }
  });
});
