import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { FIREBASE_CONFIG, EXTERNAL_RUNTIME_ASSETS } from '../src/site.config.ts';
import { getFirebaseRuntimeScript } from '../src/state/firebase.state.ts';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../src/i18n/locales.ts';
import { renderStickyActionBar } from '../src/components/layout/StickyActionBar.ts';
import { renderHeroSection } from '../src/components/protocol/HeroSection.ts';
import { renderProtocolCard } from '../src/components/feed/ProtocolCard.ts';
import { renderSearchModal } from '../src/components/layout/SearchModal.ts';
import type { Protocol } from '../src/types/protocol.types.ts';

test('Telemetry Suite 17-1: FIREBASE_CONFIG 및 자원 URL 무결성 검증', () => {
  assert.ok(FIREBASE_CONFIG.apiKey, 'Firebase apiKey가 존재해야 합니다.');
  assert.ok(FIREBASE_CONFIG.databaseURL, 'Firebase databaseURL이 존재해야 합니다.');
  assert.ok(FIREBASE_CONFIG.projectId, 'Firebase projectId가 존재해야 합니다.');

  // PWA 프리캐시 URL 오탈자 방지 검증: 'JetBrains+Mono' URL 인코딩 준수 여부
  assert.match(
    EXTERNAL_RUNTIME_ASSETS.googleFontsCss,
    /JetBrains\+Mono/,
    '구글 폰트 URL은 HTML link 태그 및 서비스워커 캐시 키와 100% 일치하도록 JetBrains+Mono여야 합니다.'
  );
  assert.doesNotMatch(
    EXTERNAL_RUNTIME_ASSETS.googleFontsCss,
    /JetBrains Mono/,
    '구글 폰트 URL에 공백(Space)이 포함되어서는 안 됩니다.'
  );
});

test('Telemetry Suite 17-2: 7개 국어 UI_STRINGS 텔레메트리 및 지표/정렬 다국어 무결성 검증', () => {
  const requiredKeys = [
    'viewsPrefix',
    'confirmSurvival',
    'toastLiked',
    'toastUnliked',
    'metricViews',
    'metricLikes',
    'metricComments',
    'sort_latest',
    'sort_oldest',
    'sort_views',
    'sort_likes',
    'sort_comments',
  ] as const;

  for (const locale of Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]) {
    const strings = UI_STRINGS[locale];
    assert.ok(strings, `로케일 [${locale}]의 UI 문자열 객체가 존재해야 합니다.`);

    for (const key of requiredKeys) {
      assert.ok(
        typeof strings[key] === 'string' && strings[key].trim().length > 0,
        `로케일 [${locale}]에 [${key}] 키가 비어있지 않은 문자열로 정의되어 있어야 합니다.`
      );
    }
  }
});

test('Telemetry Suite 17-3: getFirebaseRuntimeScript 모드 분리, 구문 검사, 장애 격리 및 vm 실행 검증', () => {
  const allScript = getFirebaseRuntimeScript();
  const feedScript = getFirebaseRuntimeScript('feed');
  const protocolScript = getFirebaseRuntimeScript('protocol');

  // 1. vm.Script Top-level Program 구문 유효성 검사
  for (const [label, src] of [
    ['all', allScript],
    ['feed', feedScript],
    ['protocol', protocolScript],
  ] as const) {
    assert.doesNotThrow(() => {
      new vm.Script(src, { filename: `firebase.${label}.runtime.js` });
    }, `런타임 스크립트(${label})는 자바스크립트 구문 오류가 없어야 합니다.`);
  }

  // 2. 피드/상세 모드 분리로 인한 데드코드 배제 검증
  assert.equal(protocolScript.includes('ps_feed_metrics_v1'), true, '상세 모드는 조회/좋아요 시 피드 캐시 패치 키를 포함할 수 있습니다.');
  assert.equal(protocolScript.includes('initFeedRemote'), false, '상세 모드는 피드 일괄 원격 조회 함수(initFeedRemote)를 포함해서는 안 됩니다.');
  assert.equal(protocolScript.includes('hydrateFeedMetricsFromCache'), false, '상세 모드는 피드 캐시 하이드레이션 함수를 포함해서는 안 됩니다.');
  assert.equal(feedScript.includes('initProtocolRemote'), false, '피드 모드는 상세 전용 initProtocolRemote를 포함해서는 안 됩니다.');
  assert.equal(feedScript.includes('initLocalProtocolUI'), false, '피드 모드는 상세 전용 initLocalProtocolUI를 포함해서는 안 됩니다.');

  // 3. 핵심 안전 가드 및 2단계 점진적 향상 계약
  assert.match(protocolScript, /safeStorage/, 'Safari 비공개 탭 방어를 위한 safeStorage 헬퍼가 있어야 합니다.');
  assert.match(protocolScript, /ps_liked_/, '로컬 좋아요 키 네임스페이스(ps_liked_)가 포함되어야 합니다.');
  assert.match(protocolScript, /aria-pressed/, '스크린리더 A11y 접근성을 위한 aria-pressed 속성이 토글되어야 합니다.');
  assert.match(protocolScript, /24 \* 60 \* 60 \* 1000/, '24시간 쿨다운(86400000ms)이 명시되어야 합니다.');
  assert.match(protocolScript, /isNaN\(lastView\)/, 'NaN 손상 시 좀비 락 자가 치유 검증이 포함되어야 합니다.');
  assert.match(allScript, /onlyOnce:\s*true/, '무료 티어 웹소켓 누수를 방지하기 위해 { onlyOnce: true }가 적용되어야 합니다.');
  assert.match(feedScript, /stats\.views !== undefined/, '조회수 0 카운트 누락 방어를 위한 !== undefined 검증이 있어야 합니다.');
  assert.match(feedScript, /stats\.likes !== undefined/, '좋아요 0 카운트 누락 방어를 위한 !== undefined 검증이 있어야 합니다.');
  assert.match(feedScript, /protocol_comments/, '피드 카드 댓글 수 동기화를 위해 protocol_comments 조회가 포함되어야 합니다.');
  assert.match(feedScript, /pageshow/, 'BFCache 복귀 시 캐시 재반영을 위한 pageshow 리스너가 있어야 합니다.');

  // 4. vm 실행 검증: 배열 캐시("[]"), Infinity/소수 오염 방어 및 안전 하이드레이션
  const store = new Map<string, string>();
  store.set('ps_feed_metrics_v1', '[]');
  const cardAttrs: Record<string, string> = {};
  const metricEls = {
    views: { textContent: '-', getAttribute(k: string) { return k === 'data-feed-views' ? 'PR-01' : null; } },
    likes: { textContent: '0' },
    comments: { textContent: '0' },
  };
  let refreshCalled = 0;
  const mockCard = {
    getAttribute(k: string) { return k === 'data-protocol-card' ? 'PR-01' : null; },
    setAttribute(k: string, v: string) { cardAttrs[k] = v; },
    querySelector(sel: string) {
      if (sel === '[data-feed-views]') return metricEls.views;
      if (sel === '[data-feed-likes]') return metricEls.likes;
      if (sel === '[data-feed-comments]') return metricEls.comments;
      return null;
    },
  };
  const baseContext = {
    window: {
      __refreshFeedSort__: () => { refreshCalled++; },
      addEventListener() {},
      requestIdleCallback: undefined,
    } as Record<string, any>,
    document: {
      documentElement: { getAttribute: () => 'ko' },
      querySelectorAll(sel: string) {
        if (sel === '[data-protocol-card]') return [mockCard];
        if (sel === '[data-feed-views]') return [metricEls.views];
        return [];
      },
      querySelector() { return null; },
      getElementById() { return null; },
    },
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
    navigator: { onLine: false },
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  baseContext.window.window = baseContext.window;

  // "[]" 배열 캐시 상태에서도 예외 없이 하이드레이션 통과
  assert.doesNotThrow(() => vm.runInNewContext(feedScript, baseContext));
  assert.equal(refreshCalled, 1, '초기 캐시 하이드레이션 후 __refreshFeedSort__가 1회 호출되어야 합니다.');

  // Infinity / 음수 / 소수 오염 값 입력 시 유한 비음수 정수로 정규화 검증
  store.set('ps_feed_metrics_v1', JSON.stringify({ 'PR-01': { v: 'Infinity', l: -5, c: 3.9 } }));
  assert.doesNotThrow(() => vm.runInNewContext(feedScript, baseContext));
  assert.equal(metricEls.views.textContent, '0', 'Infinity 조회수는 0으로 안전 정규화되어야 합니다.');
  assert.equal(metricEls.likes.textContent, '0', '음수 좋아요는 0으로 안전 정규화되어야 합니다.');
  assert.equal(metricEls.comments.textContent, '3', '소수 댓글 수는 정수로 내림 정규화되어야 합니다.');
  assert.equal(cardAttrs['data-comments'], '3');

  // 5. countValidComments 경계값(프로토타입 키 toString, 고아 답글, ps_cdel_ 로컬 삭제) vm 검증
  const countFnMatch = feedScript.match(/function countValidComments\(commentsById\)[\s\S]*?\n      \}/);
  assert.ok(countFnMatch, 'feedScript 내에 countValidComments 함수가 정의되어야 합니다.');
  store.set('ps_cdel_c_deleted', '1');
  const countValidComments = vm.runInNewContext(
    `(${countFnMatch[0]})`,
    {
      safeStorage: { getItem: (k: string) => store.get(k) ?? null },
    }
  ) as (m: unknown) => number;

  assert.equal(countValidComments(null), 0);
  assert.equal(countValidComments([]), 0);
  assert.equal(
    countValidComments({
      c_root: { id: 'c_root', parentId: '', content: '정상 루트 댓글' },
      c_reply: { id: 'c_reply', parentId: 'c_root', content: '정상 답글' },
      c_orphan: { id: 'c_orphan', parentId: 'missing_parent', content: '고아 답글' },
      c_proto_attack: { id: 'c_proto_attack', parentId: 'toString', content: '프로토타입 키 우회 시도' },
      c_deleted: { id: 'c_deleted', parentId: '', content: '로컬 삭제된 댓글' },
    }),
    2,
    '정상 루트 1 + 정상 답글 1만 유효 댓글 2건으로 집계되어야 합니다.'
  );
});

test('Telemetry Suite 17-4: 컴포넌트 DOM 계약 및 A11y/CSS 규격 검증', () => {
  // StickyActionBar
  const actionBarHtml = renderStickyActionBar('다음 프로토콜', '/protocol-02');
  assert.match(actionBarHtml, /id="btn-like-protocol"/, '생존 확인 버튼 ID가 존재해야 합니다.');
  assert.match(actionBarHtml, /id="proto-likes-count"/, '좋아요 카운터 ID가 존재해야 합니다.');
  assert.match(actionBarHtml, /min-h-\[44px\]/, '모바일 접근성을 위해 min-h-[44px] 터치 규격을 만족해야 합니다.');
  assert.match(actionBarHtml, /aria-pressed="false"/, '초기 aria-pressed="false" 속성이 있어야 합니다.');
  assert.match(actionBarHtml, /tabular-nums/, '숫자 변경 시 레이아웃 흔들림을 막기 위해 tabular-nums가 지정되어야 합니다.');
  assert.match(actionBarHtml, /safe-area-inset-bottom/, 'iOS 홈 바 겹침 방지를 위해 safe-area 패딩이 포함되어야 합니다.');

  // HeroSection
  const mockProtocol: Protocol = {
    protocolId: 'PR-99',
    category: 'FOOD',
    title: '테스트 생존 기술',
    summary: '테스트 요약 내용입니다.',
    threatLevel: 'CRITICAL',
    threatLevelText: '위험 수준: 극도',
    difficulty: '보통',
    timeRequired: '15분',
    successRate: '95%',
    outputPerHour: '2L / h',
    materials: [],
    steps: [],
    faqs: [],
    fatalMistake: {
      title: '금지 사항',
      description: '테스트 금지 내용',
      consequence: '위험 결과',
    },
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  };
  const heroHtml = renderHeroSection(mockProtocol);
  assert.match(heroHtml, /id="proto-views-count"/, '조회수 카운터 ID가 존재해야 합니다.');
  assert.match(heroHtml, /tabular-nums/, '히어로 조회수 뱃지에 CLS 방어 tabular-nums가 있어야 합니다.');

  // ProtocolCard
  const cardHtml = renderProtocolCard(mockProtocol);
  assert.match(cardHtml, /data-feed-views="PR-99"/, '피드 조회수 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-feed-likes="PR-99"/, '피드 좋아요 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-feed-comments="PR-99"/, '피드 댓글 수 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-views="0"/, '카드 정렬용 초기 data-views 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-likes="0"/, '카드 정렬용 초기 data-likes 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-comments="0"/, '카드 정렬용 초기 data-comments 속성이 있어야 합니다.');
  assert.doesNotMatch(cardHtml, />[VLC]:</, 'V:/L:/C: 텍스트 접두사 대신 직관적인 아이콘만 표시해야 합니다.');
  assert.equal((cardHtml.match(/title="Views"/g) || []).length, 1, '조회수 아이콘 그룹이 정확히 1개 있어야 합니다.');
  assert.equal((cardHtml.match(/title="Likes"/g) || []).length, 1, '좋아요 아이콘 그룹이 정확히 1개 있어야 합니다.');
  assert.equal((cardHtml.match(/title="Comments"/g) || []).length, 1, '댓글 아이콘 그룹이 정확히 1개 있어야 합니다.');
  assert.match(cardHtml, /data-i18n="metricViews"/, '조회수 스크린리더 다국어 라벨이 있어야 합니다.');
  assert.match(cardHtml, /data-i18n="metricLikes"/, '좋아요 스크린리더 다국어 라벨이 있어야 합니다.');
  assert.match(cardHtml, /data-i18n="metricComments"/, '댓글 스크린리더 다국어 라벨이 있어야 합니다.');
  assert.match(cardHtml, /tabular-nums/, '피드 텔레메트리 뱃지에 tabular-nums가 있어야 합니다.');

  // SearchModal
  const searchModalHtml = renderSearchModal('ko');
  assert.match(searchModalHtml, /z-\[60\]/, '검색 모달은 하단 고정 바(z-50)보다 높은 z-[60]이어야 합니다.');
});

test('Telemetry Suite 17-5: Firebase 보안 규칙(database.rules.json) 및 firebase.json 설정 검증', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const rulesPath = path.join(rootDir, 'database.rules.json');
  const configPath = path.join(rootDir, 'firebase.json');

  assert.ok(fs.existsSync(rulesPath), '루트에 database.rules.json 파일이 존재해야 합니다.');
  assert.ok(fs.existsSync(configPath), '루트에 firebase.json 파일이 존재해야 합니다.');

  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
  assert.ok(rules.rules && rules.rules.protocol_stats, 'protocol_stats 노드 규칙이 정의되어 있어야 합니다.');
  assert.equal(rules.rules.protocol_stats['.read'], true, 'protocol_stats는 메인 피드 조회를 위해 .read: true여야 합니다.');
  assert.ok(rules.rules.protocol_stats.$protocolId, '$protocolId 와일드카드 규칙이 정의되어 있어야 합니다.');
  assert.ok(
    String(rules.rules.protocol_stats.$protocolId['.validate'] || '').includes('^PR-[0-9]{2,4}$'),
    'protocol_stats/$protocolId에 유효 ID 정규식 검증이 있어야 합니다.'
  );
  assert.ok(rules.rules.protocol_stats.$protocolId.views['.write'].includes('newData.val() === 1'), 'views 최초 생성 시 1로 제한되어야 합니다.');
  assert.ok(rules.rules.protocol_stats.$protocolId.likes['.write'].includes('newData.val() === 1'), 'likes 최초 생성 시 1로 제한되어야 합니다.');
  assert.equal(rules.rules.protocol_stats.$protocolId.$other['.write'], false, '$other는 .write: false로 차단되어야 합니다.');

  assert.ok(rules.rules.protocol_comments, 'protocol_comments 노드 규칙이 정의되어 있어야 합니다.');
  assert.equal(rules.rules.protocol_comments['.read'], true, '메인 피드 댓글 집계를 위해 protocol_comments .read: true가 유지되어야 합니다.');
  assert.ok(
    String(rules.rules.protocol_comments.$protocolId['.validate'] || '').includes('^PR-[0-9]{2,4}$'),
    'protocol_comments/$protocolId에 유효 ID 정규식 검증이 있어야 합니다.'
  );

  const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  assert.equal(fbConfig.database.rules, 'database.rules.json', 'firebase.json이 database.rules.json을 참조해야 합니다.');
});
