import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractChosung, isPureChosung, cleanSearchText } from '../src/utils/hangul.util.ts';
import { SearchService, type SearchDocument } from '../src/services/search.service.ts';
import type { Protocol } from '../src/types/protocol.types.ts';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';

describe('🔍 [Suite 15: 클라이언트 인메모리 검색 엔진] Fuse.js 퍼지 검색, 초성 분해, 하이라이팅 및 PWA 오프라인 캐시 전수 검증', () => {
  const protocolsDir = path.resolve(process.cwd(), 'content/protocols');
  const masterProtocols: Protocol[] = fs
    .readdirSync(protocolsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(protocolsDir, f), 'utf-8')));

  // =========================================================================
  // 1. 한국어 초성 분해 및 텍스트 유틸리티 검증
  // =========================================================================
  test('extractChosung은 한글 음절을 정확한 자음 초성으로 1:1 분해하고 영문/숫자/공백을 보존해야 한다', () => {
    assert.equal(extractChosung('페트병 정수기 3단계'), 'ㅍㅌㅂ ㅈㅅㄱ 3ㄷㄱ');
    assert.equal(extractChosung('바위 덫 Figure-4'), 'ㅂㅇ ㄷ Figure-4');
    assert.equal(extractChosung('참나무 숯가루'), 'ㅊㄴㅁ ㅅㄱㄹ');
    assert.equal(extractChosung(''), '');
    assert.equal(extractChosung('ABC 123!@#'), 'ABC 123!@#');
  });

  test('isPureChosung은 오직 한글 자음과 공백으로만 구성된 검색어를 정확히 감지해야 한다', () => {
    assert.equal(isPureChosung('ㅅㅅ'), true);
    assert.equal(isPureChosung('ㅂㅇ'), true);
    assert.equal(isPureChosung('ㅊㄴㅁ'), true);
    assert.equal(isPureChosung(' ㅍㅌ '), true);

    // 일반 완성형 한글, 영문, 숫자, 혼합 텍스트는 false
    assert.equal(isPureChosung('식수'), false);
    assert.equal(isPureChosung('water'), false);
    assert.equal(isPureChosung('ㅅ1'), false);
    assert.equal(isPureChosung(''), false);
    assert.equal(isPureChosung('   '), false);
  });

  test('cleanSearchText는 HTML 태그 및 마크다운 기호를 정제하고 공백을 정규화해야 한다', () => {
    const raw = '<mark class="tag">**숯가루**</mark>와   `모래` [필터]';
    const cleaned = cleanSearchText(raw);
    assert.equal(cleaned, '숯가루 와 모래 필터');
  });

  // =========================================================================
  // 2. 검색 전용 슬림 인덱스 생성 및 메모리 절감 검증
  // =========================================================================
  test('buildSlimIndex는 대용량 에셋을 배제한 초경량 검색 문서를 생성해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');
    assert.equal(slimDocs.length, masterProtocols.length);

    for (const doc of slimDocs) {
      assert.ok(doc.id, 'ID가 존재해야 함');
      assert.ok(doc.url.startsWith('/protocol-'), 'URL이 올바른 경로여야 함');
      assert.ok(doc.title, '제목이 존재해야 함');
      assert.ok(doc.titleChosung, '한국어 인덱스에는 titleChosung이 존재해야 함');
      assert.ok(doc.summary, '요약문이 존재해야 함');
      assert.ok(doc.materials, '재료 목록이 존재해야 함');

      // 원본의 무거운 필드가 없어야 함
      assert.equal((doc as any).stepsSvgCode, undefined);
      assert.equal((doc as any).outcomeSvgCode, undefined);
    }

    // 메모리 크기 비교 (슬림 인덱스는 불필요한 메타데이터가 제거되어 원본 JSON보다 작아야 함)
    const rawBytes = Buffer.byteLength(JSON.stringify(masterProtocols));
    const slimBytes = Buffer.byteLength(JSON.stringify(slimDocs));
    assert.ok(slimBytes < rawBytes * 0.75, `슬림 인덱스(${slimBytes}B)는 원본(${rawBytes}B) 대비 25% 이상 절감되어야 함`);
  });

  // =========================================================================
  // 3. Fuse.js 퍼지 검색 및 가중치 랭킹 검증
  // =========================================================================
  test('SearchService.search는 일반 키워드로 정확한 프로토콜을 1순위로 탐색해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');

    // 1) "정수기" 검색 시 PR-01(자연 정수기)이 1순위여야 함
    const resultsWater = SearchService.search(slimDocs, '정수기');
    assert.ok(resultsWater.length > 0, '결과가 최소 1건 이상이어야 함');
    assert.equal(resultsWater[0].id, 'PR-01', '정수기 검색 1순위는 PR-01이어야 함');

    // 2) "바위" 또는 "덫" 검색 시 PR-08(숫자 4 모양 돌 덫)이 1순위여야 함
    const resultsDeadfall = SearchService.search(slimDocs, '바위');
    assert.ok(resultsDeadfall.length > 0);
    assert.equal(resultsDeadfall[0].id, 'PR-08', '바위 검색 1순위는 PR-08이어야 함');

    // 3) "숯가마" 검색 시 PR-09(지하 숯가마)가 1순위여야 함
    const resultsKiln = SearchService.search(slimDocs, '숯가마');
    assert.ok(resultsKiln.length > 0);
    assert.equal(resultsKiln[0].id, 'PR-09', '숯가마 검색 1순위는 PR-09여야 함');
  });

  // =========================================================================
  // 4. 한국어 초성 검색(ㅈㅅㄱ, ㅂㅇ, ㅅㄱㅁ) 검증
  // =========================================================================
  test('SearchService.search는 한글 초성 쿼리를 감지하여 해당 프로토콜을 즉시 탐색해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');

    // 'ㅈㅅㄱ' -> 정수기 (PR-01)
    const resPet = SearchService.search(slimDocs, 'ㅈㅅㄱ');
    assert.ok(resPet.length > 0, 'ㅈㅅㄱ 초성 검색 성공해야 함');
    assert.equal(resPet[0].id, 'PR-01', 'ㅈㅅㄱ 검색 1순위는 PR-01이어야 함');

    // 'ㅂㅇ' -> 바위 (PR-08)
    const resDeadfall = SearchService.search(slimDocs, 'ㅂㅇ');
    assert.ok(resDeadfall.length > 0, 'ㅂㅇ 초성 검색 성공해야 함');
    assert.equal(resDeadfall[0].id, 'PR-08', 'ㅂㅇ 검색 1순위는 PR-08이어야 함');

    // 'ㅅㄱㅁ' -> 숯가마 (PR-09)
    const resKiln = SearchService.search(slimDocs, 'ㅅㄱㅁ');
    assert.ok(resKiln.length > 0, 'ㅅㄱㅁ 초성 검색 성공해야 함');
    assert.equal(resKiln[0].id, 'PR-09', 'ㅅㄱㅁ 검색 1순위는 PR-09여야 함');
  });

  // =========================================================================
  // 5. 하이라이팅 및 스니펫 발췌 검증
  // =========================================================================
  test('highlightText는 매칭 구간을 택티컬 옐로우 태그로 감싸고 XSS를 방어해야 한다', () => {
    const text = '오염된 물 100% 정수하는 페트병 필터';
    const waterIdx = text.indexOf('물');
    const petIdx = text.indexOf('페트병');
    const indices: [number, number][] = [
      [waterIdx, waterIdx],
      [petIdx, petIdx + 2],
    ];
    const highlighted = SearchService.highlightText(text, indices);

    assert.ok(highlighted.includes('<mark class="bg-[#fde68a]/20 text-[#fde68a] font-bold px-0.5 border-b border-[#fde68a]/60">물</mark>'));
    assert.ok(highlighted.includes('<mark class="bg-[#fde68a]/20 text-[#fde68a] font-bold px-0.5 border-b border-[#fde68a]/60">페트병</mark>'));

    // HTML 특수문자 이스케이프 검증
    const dangerousText = '<script>alert(1)</script>';
    const safeHighlighted = SearchService.highlightText(dangerousText, [[0, 7]]);
    assert.ok(!safeHighlighted.includes('<script>'), 'XSS 스크립트 태그가 원본 그대로 노출되면 안 됨');
    assert.ok(safeHighlighted.includes('&lt;script'));
  });

  test('extractSnippet은 매칭 위치를 중심으로 앞뒤 35자를 발췌하고 말줄임표를 부착해야 한다', () => {
    const longText = '주변에서 쉽게 구할 수 있는 흙구덩이를 파고 참나무 원목을 수직으로 빽빽하게 채워 넣은 뒤 진흙 덮개를 덮어 공기를 차단한다.';
    const oakIndex = longText.indexOf('참나무');
    const indices: [number, number][] = [[oakIndex, oakIndex + 2]];

    const snippet = SearchService.extractSnippet(longText, indices, 20);
    assert.ok(snippet.includes('참나무'), '스니펫에 매칭 키워드가 포함되어야 함');
    assert.ok(snippet.startsWith('...') || snippet.endsWith('...'), '긴 문장은 말줄임표(...)가 포함되어야 함');
  });

  // =========================================================================
  // 6. 초고속 탐색 속도 (<5ms) 검증
  // =========================================================================
  test('50회 연속 검색 실행 시 평균 5ms 이내의 실시간 속도로 완결되어야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');
    const queries = ['물', '불', '숯', '바위', '트랩', 'ㅍㅌㅂ', 'ㅅㄱㅁ', 'ㄷㄷㅍ', '생존', '정수'];

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      const q = queries[i % queries.length];
      SearchService.search(slimDocs, q);
    }
    const elapsed = performance.now() - start;
    const avg = elapsed / 50;

    assert.ok(avg < 10, `평균 검색 소요시간(${avg.toFixed(2)}ms)은 10ms 미만이어야 함`);
  });

  // =========================================================================
  // 7. 다국어 UI 스트링 무결성 검증
  // =========================================================================
  test('7개 지원 언어 전체에 검색 UI 번역 문자열이 100% 누락 없이 정의되어야 한다', () => {
    const requiredKeys = [
      'searchBtn',
      'searchPlaceholder',
      'searchNoResults',
      'searchShortcutHint',
      'searchBadge',
      'searchResultsCount',
    ] as const;

    for (const [locale, ui] of Object.entries(UI_STRINGS)) {
      for (const key of requiredKeys) {
        assert.ok(
          ui[key] && ui[key].trim().length > 0,
          `언어 [${locale}]에 검색 UI 키 [${key}]가 누락되었거나 비어 있습니다.`
        );
      }
    }
  });

  // =========================================================================
  // 8. 오프라인 자산 및 PWA 캐시 정합성 검증
  // =========================================================================
  test('빌드 산출물(public/)에 검색 모달, Fuse 자산 및 sw.js 사전 캐시가 완벽히 탑재되어야 한다', () => {
    const publicDir = path.resolve(process.cwd(), 'public');

    // 1) fuse.basic.min.js 번들 자산 검증
    const fuseAssetPath = path.join(publicDir, 'assets/fuse.basic.min.js');
    assert.ok(fs.existsSync(fuseAssetPath), 'public/assets/fuse.basic.min.js가 존재해야 함');
    const fuseStat = fs.statSync(fuseAssetPath);
    assert.ok(fuseStat.size > 15000, 'Fuse 번들 크기는 15KB 이상이어야 함');

    // 2) index.html 및 protocol-01.html 내 검색 모달 마크업 검증
    const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('id="search-modal"'), 'index.html에 search-modal이 포함되어야 함');
    assert.ok(indexHtml.includes('data-action="open-search"'), 'index.html에 open-search 트리거가 포함되어야 함');
    assert.ok(indexHtml.includes('/assets/fuse.basic.min.js'), 'index.html에 fuse 스크립트 태그가 포함되어야 함');

    const protoHtml = fs.readFileSync(path.join(publicDir, 'protocol-01.html'), 'utf-8');
    assert.ok(protoHtml.includes('id="search-modal"'), '상세 페이지에 search-modal이 포함되어야 함');
    assert.ok(protoHtml.includes('data-action="open-search"'), '상세 페이지에 open-search 트리거가 포함되어야 함');

    // 3) sw.js 사전 캐시 목록에 fuse.basic.min.js 등록 검증
    const swJs = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf-8');
    assert.ok(swJs.includes('/assets/fuse.basic.min.js'), 'sw.js PRECACHE_URLS에 fuse.basic.min.js가 등록되어야 함');
  });
});
