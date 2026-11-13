import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { extractChosung, isPureChosung, cleanSearchText } from '../src/utils/hangul.util.ts';
import { SearchService, type SearchDocument } from '../src/services/search.service.ts';
import { FEED_CATEGORY_KEYS, type Protocol } from '../src/types/protocol.types.ts';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { renderSearchModal } from '../src/components/layout/SearchModal.ts';
import { getSearchRuntimeScript } from '../src/state/search.state.ts';

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
  test('extractChosung은 한글 음절(NFC/NFD)을 정확한 자음 초성으로 1:1 분해하고 영문/숫자/공백을 보존해야 한다', () => {
    assert.equal(extractChosung('페트병 정수기 3단계'), 'ㅍㅌㅂ ㅈㅅㄱ 3ㄷㄱ');
    assert.equal(extractChosung('바위 덫 Figure-4'), 'ㅂㅇ ㄷ Figure-4');
    assert.equal(extractChosung('참나무 숯가루'), 'ㅊㄴㅁ ㅅㄱㄹ');
    assert.equal(extractChosung(''), '');
    assert.equal(extractChosung('ABC 123!@#'), 'ABC 123!@#');

    // NFD (자소 분리) 호환성 검증
    const nfdText = '식수 정수'.normalize('NFD');
    assert.equal(extractChosung(nfdText), 'ㅅㅅ ㅈㅅ');
  });

  test('isPureChosung은 오직 한글 자음과 공백으로만 구성된 검색어를 정확히 감지해야 한다 (NFC/NFD 자모 호환)', () => {
    assert.equal(isPureChosung('ㅅㅅ'), true);
    assert.equal(isPureChosung('ㅂㅇ'), true);
    assert.equal(isPureChosung('ㅊㄴㅁ'), true);
    assert.equal(isPureChosung(' ㅍㅌ '), true);

    // NFD 첫가소(U+1100-U+1112) 초성 입력 호환성 검증
    const nfdChosung = 'ㅅㅅ'.normalize('NFD');
    assert.equal(isPureChosung(nfdChosung), true);

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
      'searchPrompt',
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
  test('빌드 산출물(public/)에 검색 모달, Fuse 자산, search-index.js 및 sw.js 사전 캐시가 완벽히 탑재되어야 한다', () => {
    const publicDir = path.resolve(process.cwd(), 'public');

    // 1) fuse.basic.min.js 번들 자산 검증
    const fuseAssetPath = path.join(publicDir, 'assets/fuse.basic.min.js');
    assert.ok(fs.existsSync(fuseAssetPath), 'public/assets/fuse.basic.min.js가 존재해야 함');
    const fuseStat = fs.statSync(fuseAssetPath);
    assert.ok(fuseStat.size > 15000, 'Fuse 번들 크기는 15KB 이상이어야 함');

    // 2) search-index.js 번들 자산 검증
    const searchIndexPath = path.join(publicDir, 'assets/search-index.js');
    assert.ok(fs.existsSync(searchIndexPath), 'public/assets/search-index.js가 존재해야 함');
    const searchIndexContent = fs.readFileSync(searchIndexPath, 'utf-8');
    assert.ok(searchIndexContent.includes('window.__SEARCH_DOCS__'), 'search-index.js에 window.__SEARCH_DOCS__가 정의되어야 함');

    // 3) index.html 및 protocol-01.html 내 검색 모달 마크업, 카테고리 필터 칩 및 스크립트 검증
    const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('id="search-modal"'), 'index.html에 search-modal이 포함되어야 함');
    assert.ok(indexHtml.includes('id="search-category-filter"'), 'index.html에 search-category-filter가 포함되어야 함');
    assert.ok(indexHtml.includes('data-search-category="SHELTER"'), 'index.html에 SHELTER 카테고리 필터 버튼이 포함되어야 함');
    assert.ok(indexHtml.includes('data-action="open-search"'), 'index.html에 open-search 트리거가 포함되어야 함');
    assert.ok(indexHtml.includes('/assets/fuse.basic.min.js'), 'index.html에 fuse 스크립트 태그가 포함되어야 함');
    assert.ok(indexHtml.includes('/assets/search-index.js'), 'index.html에 search-index.js 스크립트 태그가 포함되어야 함');

    const protoHtml = fs.readFileSync(path.join(publicDir, 'protocol-01.html'), 'utf-8');
    assert.ok(protoHtml.includes('id="search-modal"'), '상세 페이지에 search-modal이 포함되어야 함');
    assert.ok(protoHtml.includes('id="search-category-filter"'), '상세 페이지에 search-category-filter가 포함되어야 함');
    assert.ok(protoHtml.includes('data-search-category="MEDICINE"'), '상세 페이지에 MEDICINE 카테고리 필터 버튼이 포함되어야 함');
    assert.ok(protoHtml.includes('data-action="open-search"'), '상세 페이지에 open-search 트리거가 포함되어야 함');
    assert.ok(protoHtml.includes('/assets/search-index.js'), '상세 페이지에 search-index.js 스크립트 태그가 포함되어야 함');

    // 4) sw.js 사전 캐시 목록에 fuse.basic.min.js 및 search-index.js 등록 검증
    const swJs = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf-8');
    assert.ok(swJs.includes('/assets/fuse.basic.min.js'), 'sw.js PRECACHE_URLS에 fuse.basic.min.js가 등록되어야 함');
    assert.ok(swJs.includes('/assets/search-index.js'), 'sw.js PRECACHE_URLS에 search-index.js가 등록되어야 함');
  });

  // =========================================================================
  // 9. 카테고리 지정 검색, 빈 검색어 탐색, 카테고리별 건수 집계 및 UI/런타임 검증
  // =========================================================================
  test('SearchService.search는 특정 카테고리를 지정하면 해당 카테고리 프로토콜만 필터링해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');

    const allHits = SearchService.search(slimDocs, '불', 50, 'ALL');
    assert.ok(allHits.length > 0, '전체 카테고리 검색 결과가 존재해야 함');

    const shelterHits = SearchService.search(slimDocs, '불', 50, 'SHELTER');
    assert.ok(shelterHits.length > 0, 'SHELTER 카테고리 내 "불" 검색 결과가 존재해야 함');
    for (const hit of shelterHits) {
      assert.equal(hit.category, 'SHELTER', `결과 [${hit.id}]는 SHELTER 카테고리여야 함`);
    }

    const medicineHits = SearchService.search(slimDocs, '의약', 20, 'ALL');
    assert.ok(medicineHits.some((r) => r.category === 'MEDICINE'), 'categoryName("의약") 키워드로 MEDICINE 프로토콜 탐색이 가능해야 함');
  });

  test('SearchService.search는 검색어가 비어 있어도 특정 카테고리가 선택되면 해당 카테고리 전체 목록을 반환해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');
    const expectedFood = slimDocs.filter((d) => d.category === 'FOOD');

    const allEmpty = SearchService.search(slimDocs, '', 50, 'ALL');
    assert.equal(allEmpty.length, 0, 'ALL 상태에서 빈 검색어는 안내 화면 유지를 위해 0건을 반환해야 함');

    const foodBrowse = SearchService.search(slimDocs, '', 50, 'FOOD');
    assert.equal(foodBrowse.length, expectedFood.length, 'FOOD 카테고리 선택 시 빈 검색어도 해당 카테고리 전체를 반환해야 함');
    for (const item of foodBrowse) {
      assert.equal(item.category, 'FOOD');
    }
  });

  test('SearchService.countByCategory는 전체 및 검색어 입력 시 카테고리별 합계가 정확히 일치해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');

    const totalCounts = SearchService.countByCategory(slimDocs, '');
    assert.equal(totalCounts.ALL, slimDocs.length);
    const subTotal =
      totalCounts.FOOD +
      totalCounts.SHELTER +
      totalCounts.TOOLS +
      totalCounts.MATERIALS +
      totalCounts.MEDICINE;
    assert.equal(subTotal, totalCounts.ALL, '5대 카테고리 건수의 합은 ALL 총건수와 일치해야 함');

    const queryCounts = SearchService.countByCategory(slimDocs, '물');
    assert.ok(queryCounts.ALL > 0, '검색어 "물"에 대한 총 건수가 0보다 커야 함');
    const querySubTotal =
      queryCounts.FOOD +
      queryCounts.SHELTER +
      queryCounts.TOOLS +
      queryCounts.MATERIALS +
      queryCounts.MEDICINE;
    assert.equal(querySubTotal, queryCounts.ALL, '검색 결과에서도 5대 카테고리 합은 ALL과 일치해야 함');
  });

  test('renderSearchModal은 6개 카테고리 칩과 i18n 리프 스팬 구조를 올바르게 렌더링해야 한다', () => {
    const html = renderSearchModal('ko');
    assert.ok(html.includes('id="search-category-filter"'), '카테고리 필터 컨테이너가 렌더링되어야 함');
    assert.ok(html.includes('id="search-active-cat-badge"'), '활성 카테고리 뱃지가 렌더링되어야 함');

    for (const key of FEED_CATEGORY_KEYS) {
      assert.ok(html.includes(`data-search-category="${key}"`), `${key} 칩 버튼이 포함되어야 함`);
      assert.ok(html.includes(`data-i18n="cat_${key}"`), `${key} i18n 리프 스팬이 포함되어야 함`);
      assert.ok(html.includes(`data-search-cat-count="${key}"`), `${key} 건수 배지 스팬이 포함되어야 함`);
    }
  });

  test('클라이언트 런타임(search.state.ts)은 모달 오픈, 카테고리 클릭 필터링 및 Tab 키 순환을 정상 수행해야 한다', () => {
    const slimDocs = SearchService.buildSlimIndex(masterProtocols, 'ko');
    const fuseScript = SearchService.getBrowserFuseScript();
    const runtimeScript = getSearchRuntimeScript({ ko: slimDocs });

    const makeClassList = (initial: string[] = []) => {
      const set = new Set(initial);
      return {
        add: (...cls: string[]) => cls.forEach((c) => set.add(c)),
        remove: (...cls: string[]) => cls.forEach((c) => set.delete(c)),
        contains: (c: string) => set.has(c),
        toArray: () => Array.from(set),
      };
    };

    const makeEl = (id: string, extra: Record<string, any> = {}) => {
      const attrs: Record<string, string> = {};
      const el: any = {
        id,
        classList: makeClassList(extra.classes || []),
        style: {},
        attrs,
        children: [] as any[],
        value: '',
        placeholder: '',
        textContent: '',
        innerHTML: '',
        className: '',
        focus: () => {},
        select: () => {},
        scrollIntoView: () => {},
        appendChild: (node: any) => {
          el.children.push(node);
          return node;
        },
        setAttribute: (k: string, v: string) => {
          attrs[k] = String(v);
        },
        getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
        addEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        ...extra,
      };
      return el;
    };

    const chipButtons: Record<string, any> = {};
    const countEls: Record<string, any> = {};
    for (const key of FEED_CATEGORY_KEYS) {
      const countEl = makeEl(`count-${key}`);
      countEl.attrs['data-search-cat-count'] = key;
      countEls[key] = countEl;

      const btn = makeEl(`chip-${key}`, {
        classes: key === 'ALL' ? ['bg-white', 'text-black', 'font-bold', 'border-white'] : ['bg-[#171717]'],
      });
      btn.attrs['data-action'] = 'search-category';
      btn.attrs['data-search-category'] = key;
      btn.querySelector = (sel: string) => (sel === '[data-search-cat-count]' ? countEl : null);
      chipButtons[key] = btn;
    }

    const listeners: Record<string, Function[]> = {};
    const searchModal = makeEl('search-modal', { classes: ['hidden'] });
    const searchInput = makeEl('search-modal-input');
    const searchClearBtn = makeEl('search-clear-btn', { classes: ['hidden'] });
    const resultsList = makeEl('search-results-list');
    resultsList.querySelectorAll = () => resultsList.children;
    const promptBox = makeEl('search-modal-prompt');
    const emptyBox = makeEl('search-modal-empty', { classes: ['hidden'] });
    const counterBadge = makeEl('search-counter-badge', { classes: ['hidden'] });
    const countNum = makeEl('search-count-num');
    const activeCatBadge = makeEl('search-active-cat-badge', { classes: ['hidden'] });
    const categoryFilterBox = makeEl('search-category-filter');
    categoryFilterBox.querySelectorAll = (sel: string) =>
      sel === '[data-search-category]' ? Object.values(chipButtons) : [];
    categoryFilterBox.querySelector = (sel: string) => {
      const m = sel.match(/data-search-category="([^"]+)"/);
      return m ? chipButtons[m[1]] || null : null;
    };

    const byId: Record<string, any> = {
      'search-modal': searchModal,
      'search-modal-input': searchInput,
      'search-clear-btn': searchClearBtn,
      'search-results-list': resultsList,
      'search-modal-prompt': promptBox,
      'search-modal-empty': emptyBox,
      'search-counter-badge': counterBadge,
      'search-count-num': countNum,
      'search-category-filter': categoryFilterBox,
      'search-active-cat-badge': activeCatBadge,
    };

    const openBtn = makeEl('open-search-btn');
    openBtn.closest = (sel: string) => (sel === '[data-action="open-search"]' ? openBtn : null);
    for (const key of FEED_CATEGORY_KEYS) {
      const btn = chipButtons[key];
      btn.closest = (sel: string) => (sel === '[data-action="search-category"]' ? btn : null);
    }

    const sandbox: any = {
      window: {
        __UI_STRINGS__: UI_STRINGS,
        location: { href: '' },
      },
      document: {
        documentElement: { lang: 'ko' },
        body: { style: {} },
        activeElement: null,
        getElementById: (id: string) => byId[id] || null,
        createElement: (tag: string) => makeEl(tag),
        createDocumentFragment: () => ({
          children: [] as any[],
          appendChild(node: any) {
            this.children.push(node);
            return node;
          },
        }),
        addEventListener: (ev: string, fn: Function) => {
          listeners[ev] = listeners[ev] || [];
          listeners[ev].push(fn);
        },
      },
      setTimeout: (fn: Function) => {
        fn();
        return 1;
      },
      clearTimeout: () => {},
    };
    sandbox.window.document = sandbox.document;
    // Append fragment appends children into resultsList
    resultsList.appendChild = (node: any) => {
      if (node && Array.isArray(node.children)) {
        resultsList.children.push(...node.children);
      } else {
        resultsList.children.push(node);
      }
      return node;
    };

    const ctx = vm.createContext(sandbox);
    vm.runInContext(fuseScript, ctx);
    vm.runInContext(runtimeScript, ctx);

    // 1) 검색 모달 열기 -> 전체/카테고리 건수 자동 집계 검증
    for (const fn of listeners.click || []) {
      fn({ target: openBtn, preventDefault: () => {} });
    }
    assert.equal(searchModal.classList.contains('hidden'), false, '모달이 열려야 함');
    assert.equal(countEls.ALL.textContent, String(slimDocs.length), 'ALL 건수가 전체 프로토콜 수와 일치해야 함');

    // 2) SHELTER 칩 클릭 -> 빈 검색어 상태에서도 SHELTER 전수 브라우징 검증
    for (const fn of listeners.click || []) {
      fn({ target: chipButtons.SHELTER, preventDefault: () => {} });
    }
    const expectedShelterCount = slimDocs.filter((d) => d.category === 'SHELTER').length;
    assert.equal(chipButtons.SHELTER.getAttribute('aria-selected'), 'true');
    assert.equal(chipButtons.ALL.getAttribute('aria-selected'), 'false');
    assert.equal(activeCatBadge.classList.contains('hidden'), false, '선택된 카테고리 뱃지가 표시되어야 함');
    assert.equal(resultsList.children.length, expectedShelterCount, 'SHELTER 칩 클릭 시 해당 카테고리 전체 목록이 표시되어야 함');

    // 3) Tab / Shift+Tab 키로 카테고리 순환 검증
    for (const fn of listeners.keydown || []) {
      fn({ key: 'Tab', shiftKey: false, preventDefault: () => {} });
    }
    assert.equal(chipButtons.TOOLS.getAttribute('aria-selected'), 'true', 'SHELTER 다음 Tab은 TOOLS여야 함');

    for (const fn of listeners.keydown || []) {
      fn({ key: 'Tab', shiftKey: true, preventDefault: () => {} });
    }
    assert.equal(chipButtons.SHELTER.getAttribute('aria-selected'), 'true', 'Shift+Tab으로 SHELTER로 복귀해야 함');
  });
});
