import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'node:vm';
import { fileURLToPath } from 'url';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../src/i18n/locales.ts';
import { FEED_SORT_OPTIONS } from '../src/types/protocol.types.ts';
import { renderFeedHeader } from '../src/components/feed/FeedHeader.ts';
import { getFeedRuntimeScript } from '../src/state/feed.state.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const indexPath = path.join(publicDir, 'index.html');
const swPath = path.join(publicDir, 'sw.js');

function createMockCard(opts: { pid: string; category: string; createdAt: string; views: string; likes: string; comments: string }) {
  const attrs: Record<string, string> = {
    'data-protocol-card': opts.pid,
    'data-category': opts.category,
    'data-created-at': opts.createdAt,
    'data-views': opts.views,
    'data-likes': opts.likes,
    'data-comments': opts.comments,
    'data-protocol-href': `/protocol-${opts.pid.replace(/[^0-9]/g, '')}`,
  };
  return {
    style: { display: '' },
    getAttribute(k: string) { return k in attrs ? attrs[k] : null; },
    setAttribute(k: string, v: string) { attrs[k] = String(v); },
  };
}

describe('📑 [Suite 5: 메인 인덱스 & 페이징] 5개 카드 피드 및 오프라인 캐시 무결성 검증', () => {
  test('public/index.html 파일이 존재하고 정상 크기여야 한다', () => {
    assert.ok(fs.existsSync(indexPath), 'index.html 파일이 존재해야 합니다.');
    const stat = fs.statSync(indexPath);
    assert.ok(stat.size > 2000, `index.html 크기가 너무 작습니다 (${stat.size} bytes)`);
  });

  test('index.html 내에 ARCHIVE-0 명칭이 배제되고 생존 교범 브랜딩이 적용되어야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.equal(html.includes('[ARCHIVE-0]'), false, '헤더나 본문에 ARCHIVE-0이 포함되어서는 안 됩니다.');
    assert.ok(html.includes('생존 교범'), '생존 교범 브랜딩이 포함되어야 합니다.');
  });

  test('index.html 내에 5개 단위 페이징과 카테고리 필터 요소가 탑재되어야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes('id="pagination-nav"'), '페이징 네비게이션이 존재해야 합니다.');
    assert.ok(html.includes('data-action="goto-page"'), '페이지 이동 액션이 존재해야 합니다.');
    assert.ok(html.includes('data-action="filter-category"'), '카테고리 필터 액션이 존재해야 합니다.');
    assert.ok(html.includes('data-protocol-card='), '프로토콜 카드들이 렌더링되어 있어야 합니다.');
    assert.ok(html.includes('id="pagination-prev-btn"'), '이전 페이지 버튼이 존재해야 합니다.');
    assert.ok(html.includes('id="pagination-next-btn"'), '다음 페이지 버튼이 존재해야 합니다.');
  });

  test('페이징 런타임 스크립트는 2페이지 진입 시 이전 버튼을 활성화하고 1페이지를 가리켜야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes("prevBtn.setAttribute('data-page-target', prevTarget)"), '이전 버튼의 타겟 페이지를 동적으로 갱신해야 함');
    assert.ok(html.includes("nextBtn.setAttribute('data-page-target', nextTarget)"), '다음 버튼의 타겟 페이지를 동적으로 갱신해야 함');
    assert.ok(html.includes("prevBtn.removeAttribute('disabled')"), '1페이지를 벗어났을 때 이전 버튼의 disabled가 해제되어야 함');
    assert.ok(html.includes("nextBtn.removeAttribute('disabled')"), '마지막 페이지를 벗어났을 때 다음 버튼의 disabled가 해제되어야 함');
  });

  test('sw.js에 메인 인덱스와 각 프로토콜 상세 페이지가 사전 캐시 목록에 등재되어야 한다', () => {
    const sw = fs.readFileSync(swPath, 'utf-8');
    assert.ok(sw.includes('"/index.html"'), 'index.html이 precache에 포함되어야 합니다.');
    assert.ok(sw.includes('"/protocol-01.html"'), 'protocol-01.html이 precache에 포함되어야 합니다.');
  });

  test('renderFeedHeader 5종 정렬 옵션이 7개국어 UI_STRINGS와 1:1 매핑되고 index.html에 반영되어야 한다', () => {
    const headerHtml = renderFeedHeader(10);
    for (const opt of FEED_SORT_OPTIONS) {
      assert.ok(headerHtml.includes(`data-sort-value="${opt.id}"`), `헤더에 정렬 옵션 '${opt.id}'가 있어야 합니다.`);
      assert.ok(headerHtml.includes(`data-i18n="${opt.i18nKey}"`), `헤더에 'data-i18n="${opt.i18nKey}"'가 있어야 합니다.`);
      for (const locale of Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]) {
        const val = UI_STRINGS[locale][opt.i18nKey];
        assert.ok(typeof val === 'string' && val.trim().length > 0, `[${locale}] ${opt.i18nKey} 값이 비어 있지 않아야 합니다.`);
      }
    }
    assert.equal(UI_STRINGS.es.sort_likes, 'Más valorados', '스페인어 sort_likes는 자연스러운 표현이어야 합니다.');
    assert.equal(UI_STRINGS.ja.sort_comments, 'コメント数順', '일본어 sort_comments는 수량 표현이 일관되어야 합니다.');

    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes('data-action="toggle-sort"'), '정렬 드롭다운 트리거 버튼이 존재해야 합니다.');
    assert.ok(html.includes('id="sort-dropdown-menu"'), '5종 정렬 드롭다운 메뉴 컨테이너가 존재해야 합니다.');
    assert.ok(html.includes('aria-labelledby="sort-toggle-btn"'), '정렬 드롭다운에 접근성 라벨 연결이 있어야 합니다.');
    assert.ok(html.includes('id="sort-toggle-label"'), '정렬 토글 라벨 요소가 존재해야 합니다.');
    assert.ok(html.includes('data-card-date='), '피드 카드에 날짜 배지가 존재해야 합니다.');
    assert.ok(html.includes('data-feed-comments='), '피드 카드에 댓글 수 배지(data-feed-comments)가 존재해야 합니다.');
    assert.ok(html.includes('data-views="0"') && html.includes('data-likes="0"') && html.includes('data-comments="0"'), '피드 카드에 정렬용 초기 텔레메트리 속성이 존재해야 합니다.');
    assert.ok(html.includes('window.__refreshFeedSort__'), '원격 텔레메트리 수신 후 자동 재정렬 훅이 탑재되어야 합니다.');
    assert.equal(html.includes('user-scalable=no'), false, '모바일 접근성(WCAG 1.4.4)을 위해 핀치 줌을 차단해서는 안 됩니다.');
    assert.equal(html.includes('.replace(/D/g'), false, '정규식 이스케이프 손상(/D/g)이 빌드 결과물에 존재해서는 안 됩니다.');

    // 카드 순서 검증: PR-08(최신)이 PR-01(초기)보다 먼저 렌더링되어야 함
    const p08Idx = html.indexOf('data-protocol-card="PR-08"');
    const p01Idx = html.indexOf('data-protocol-card="PR-01"');
    assert.ok(p08Idx !== -1 && p01Idx !== -1, 'PR-08 및 PR-01 카드가 존재해야 합니다.');
    assert.ok(p08Idx < p01Idx, 'PR-08(최신)이 PR-01보다 앞에 위치해야 합니다.');

    // 상세 페이지에 createdAt 날짜 배지가 탑재되어야 함
    const p08Html = fs.readFileSync(path.join(publicDir, 'protocol-08.html'), 'utf-8');
    assert.ok(p08Html.includes('data-proto="createdAt"'), '상세 히어로에 data-proto="createdAt" 배지가 존재해야 합니다.');
  });

  test('getFeedRuntimeScript vm.Script 구문 검증 및 5종 정렬·타이브레이커·__refreshFeedSort__ 실제 런타임 실행 검증', () => {
    const script = getFeedRuntimeScript();
    assert.doesNotThrow(() => {
      new vm.Script(script, { filename: 'feed.runtime.js' });
    }, '피드 런타임 스크립트는 Top-level Program 구문 오류가 없어야 합니다.');
    assert.equal(script.includes('.replace(/D/g'), false, '이스케이프가 깨진 /D/g 패턴이 포함되지 않아야 합니다.');

    function runFeedInVm(searchQuery: string, afterMetricUpdate?: (cards: ReturnType<typeof createMockCard>[], win: Record<string, any>) => void) {
      const cards = [
        createMockCard({ pid: 'PR-02', category: 'SHELTER', createdAt: '2026-10-10T00:00:00.000Z', views: '10', likes: '50', comments: '1' }),
        createMockCard({ pid: 'PR-10', category: 'FOOD', createdAt: '2026-10-10T00:00:00.000Z', views: '10', likes: '20', comments: '9' }),
        createMockCard({ pid: 'PR-05', category: 'FOOD', createdAt: 'invalid-date', views: '300', likes: '5', comments: '3' }),
      ];
      const appendedOrder: string[] = [];
      const feedContainer = {
        appendChild(el: { getAttribute: (k: string) => string | null }) {
          appendedOrder.push(el.getAttribute('data-protocol-card') || '');
        },
      };
      const sortBtn = { attributes: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attributes[k] = v; }, focus() {} };
      const sortLabel = { textContent: '', setAttribute() {} };
      const mockWindow: Record<string, any> = {
        location: { search: searchQuery, pathname: '/', hash: '' },
        history: { replaceState() {} },
        navigator: { language: 'ko', languages: ['ko'] },
        addEventListener() {},
        getSelection() { return { toString: () => '' }; },
      };
      const mockDocument = {
        documentElement: { lang: 'ko', setAttribute() {}, removeAttribute() {} },
        activeElement: null,
        title: '',
        addEventListener() {},
        createElement() { return { type: '', setAttribute() {}, className: '', textContent: '' }; },
        getElementById(id: string) {
          if (id === 'protocol-feed-container') return feedContainer;
          if (id === 'sort-toggle-btn') return sortBtn;
          if (id === 'sort-toggle-label') return sortLabel;
          return null;
        },
        querySelectorAll(sel: string) {
          if (sel === '[data-protocol-card]') return cards;
          return [];
        },
      };
      const context = {
        window: mockWindow,
        document: mockDocument,
        navigator: mockWindow.navigator,
        URLSearchParams,
        setTimeout: () => 0,
        clearTimeout: () => {},
        console,
      };
      mockWindow.window = mockWindow;
      mockWindow.document = mockDocument;
      vm.runInNewContext(script, context);
      const initialOrder = appendedOrder.slice();
      appendedOrder.length = 0;
      if (afterMetricUpdate) {
        afterMetricUpdate(cards, mockWindow);
      }
      return { initialOrder, refreshedOrder: appendedOrder.slice(), sortLabel: sortLabel.textContent };
    }

    // 1. 동일 날짜 동률 시 PR-10이 PR-02보다 먼저 정렬되어야 함 (/[^0-9]/g 타이브레이커 + invalid-date -> 0)
    const latestRes = runFeedInVm('?sort=latest');
    assert.deepEqual(latestRes.initialOrder, ['PR-10', 'PR-02', 'PR-05'], '동일 날짜 동률 시 숫자 큰 PR-10이 먼저 오고 invalid-date(0)가 뒤로 가야 합니다.');

    // 2. oldest 정렬: invalid-date(0)가 가장 먼저, 동일 날짜는 PR-02가 PR-10보다 먼저
    const oldestRes = runFeedInVm('?sort=oldest');
    assert.deepEqual(oldestRes.initialOrder, ['PR-05', 'PR-02', 'PR-10'], 'oldest 정렬 시 PR-05(0) -> PR-02 -> PR-10 순이어야 합니다.');

    // 3. views / likes / comments 정렬 + 동률 타이브레이커 검증
    assert.deepEqual(runFeedInVm('?sort=views').initialOrder, ['PR-05', 'PR-10', 'PR-02']);
    assert.deepEqual(runFeedInVm('?sort=likes').initialOrder, ['PR-02', 'PR-10', 'PR-05']);
    assert.deepEqual(runFeedInVm('?sort=comments').initialOrder, ['PR-10', 'PR-05', 'PR-02']);

    // 4. __refreshFeedSort__는 일치하는 메트릭 변경 시에만 재정렬 수행
    const refreshRes = runFeedInVm('?sort=comments', (cards, win) => {
      cards[0].setAttribute('data-comments', '999'); // PR-02를 최상위로
      win.__refreshFeedSort__(['views', 'likes']); // comments 미포함 -> 스킵되어야 함
      assert.equal(win.__refreshFeedSort__.length >= 0, true);
      win.__refreshFeedSort__(['comments']); // comments 포함 -> 재정렬되어야 함
    });
    assert.deepEqual(refreshRes.refreshedOrder, ['PR-02', 'PR-10', 'PR-05']);
  });

  test('메인 index.html과 상세 페이지 상단/하단 제목 영역이 7개국어(ko, en, ja, es, de, pt, zh-TW) 핫스왑 바인딩을 완비해야 한다', () => {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(indexHtml.includes('window.__FEED_PROTOCOLS__ ='), '메인 피드에 7개국어 프로토콜 맵이 내장되어야 함');
    assert.ok(indexHtml.includes('data-i18n="feedHeroHeadline"'), '메인 히어로 헤드라인 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-title="PR-01"'), '피드 카드 제목 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-summary="PR-01"'), '피드 카드 요약 다국어 바인딩 필수');
    assert.ok(indexHtml.includes('data-card-mat="PR-01"'), '피드 카드 재료 칩 다국어 바인딩 필수');

    const p01Html = fs.readFileSync(path.join(publicDir, 'protocol-01.html'), 'utf-8');
    assert.ok(p01Html.includes('data-i18n="brandShort"'), '상세 상단 헤더 브랜드 다국어 바인딩 필수');
    assert.ok(p01Html.includes('data-i18n="checklistDesc"'), '상세 체크리스트 설명 문구 다국어 바인딩 필수');
    assert.ok(p01Html.includes('href="/protocol-02"'), '하단 다음 프로토콜 링크가 실제 경로를 가리켜야 함');
    assert.ok(p01Html.includes('"nextProtocolTitle":"Next: '), '영어 다음 프로토콜 제목이 내장되어야 함');
    assert.equal(p01Html.includes('"nextProtocolTitle":"Next: PR-02'), false, '다음 프로토콜 제목에 PR-02 번호가 노출되지 않아야 함');
    assert.equal(indexHtml.includes('>PR-01<'), false, '메인 피드 카드에 PR-01 번호 배지가 노출되지 않아야 함');
    assert.equal(p01Html.includes('FIELD SURVIVAL PROTOCOL // PR-01'), false, '상세 히어로에 PR-01 번호가 노출되지 않아야 함');

    // 모든 빌드된 HTML 페이지에서 다국어 바인딩(data-i18n, data-proto, data-card, data-svg)이 누락된 하드코딩 한글이 0건인지 전수 검사
    for (const fileName of ['index.html', 'protocol-01.html', 'protocol-02.html']) {
      const html = fs.readFileSync(path.join(publicDir, fileName), 'utf-8');
      const body = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');
      const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>([^<]*[가-힣]+[^<]*)<\/\1>/g;
      let match;
      while ((match = tagRegex.exec(body)) !== null) {
        const attrs = match[2];
        const text = match[3].trim();
        const isBound =
          attrs.includes('data-i18n') ||
          attrs.includes('data-proto') ||
          attrs.includes('data-card') ||
          attrs.includes('data-svg');
        assert.ok(isBound, `[${fileName}] 다국어 바인딩 누락 한글 발견: <${match[1]}${attrs}>${text}</${match[1]}>`);

        // data-i18n 속성이 있는 경우 7개국어 UI_STRINGS 사전에 유효한 키로 등록되어 있는지 엄격 검증
        const i18nMatch = attrs.match(/data-i18n="([^"]+)"/);
        if (i18nMatch) {
          const key = i18nMatch[1];
          for (const locale of Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]) {
            assert.ok(
              (UI_STRINGS[locale] as Record<string, string>)[key] !== undefined,
              `[${fileName}] data-i18n="${key}" 속성이 존재하나 UI_STRINGS.${locale}에 키가 누락되었습니다!`
            );
          }
        }
      }
    }
  });

  test('메인 index.html 피드 카드 요약에 마크다운 원문이 노출되지 않고 인라인 크로스링크 및 호버 팝오버가 탑재되어야 한다', () => {
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(html.includes('id="tactical-crosslink-popover"'), '메인 페이지에 크로스링크 프리뷰 팝오버(#tactical-crosslink-popover)가 탑재되어야 함');
    assert.ok(html.includes('showPopoverForAnchor'), '메인 페이지에 크로스링크 호버 런타임 스크립트가 내장되어야 함');
    assert.equal(/data-card-summary="[^"]*"[^>]*>[^<]*\[[^\]]+\]\(\/protocol-[^)]+\)/.test(html), false, '피드 카드 요약에 마크다운 링크 원문이 그대로 노출되어선 안 됨');
    assert.ok(html.includes('data-card-summary="PR-14"'), 'PR-14 카드가 존재해야 함');
    assert.ok(html.includes('data-proto="crosslink"'), '카드 요약 내 크로스링크(data-proto="crosslink") 태그가 정상 렌더링되어야 함');
  });
});
