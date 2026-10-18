import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FIREBASE_CONFIG, EXTERNAL_RUNTIME_ASSETS } from '../src/site.config.ts';
import { getFirebaseRuntimeScript } from '../src/state/firebase.state.ts';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { SUPPORTED_LOCALES } from '../src/i18n/locales.ts';
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

test('Telemetry Suite 17-2: 7개 국어 UI_STRINGS 텔레메트리 다국어 무결성 검증', () => {
  const requiredKeys = ['viewsPrefix', 'confirmSurvival', 'toastLiked', 'toastUnliked'] as const;

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

test('Telemetry Suite 17-3: getFirebaseRuntimeScript 2단계 점진적 향상 및 장애 격리 검증', () => {
  const script = getFirebaseRuntimeScript();

  // 1. 구문 유효성 검사 (Function 생성자로 문법 오류 탐지)
  assert.doesNotThrow(() => {
    new Function(script);
  }, '런타임 스크립트는 자바스크립트 구문 오류가 없어야 합니다.');

  // 2. Zero-Dependency Local Phase (동기 실행 & 오프라인 지원)
  assert.match(script, /safeStorage/, 'Safari 비공개 탭 방어를 위한 safeStorage 헬퍼가 있어야 합니다.');
  assert.match(script, /ps_liked_/, '로컬 좋아요 키 네임스페이스(ps_liked_)가 포함되어야 합니다.');
  assert.match(script, /aria-pressed/, '스크린리더 A11y 접근성을 위한 aria-pressed 속성이 토글되어야 합니다.');
  assert.match(script, /btn-like-protocol/, '좋아요 버튼 ID가 바인딩되어야 합니다.');

  // 3. Zombie View Lock 자가 치유 및 쿨다운 검증
  assert.match(script, /24 \* 60 \* 60 \* 1000/, '24시간 쿨다운(86400000ms)이 명시되어야 합니다.');
  assert.match(script, /isNaN\(lastView\)/, 'NaN 손상 시 좀비 락 자가 치유 검증이 포함되어야 합니다.');

  // 4. 웹소켓 누수 방지 및 BFCache 보존
  assert.match(script, /onlyOnce:\s*true/, '무료 티어 웹소켓 누수를 방지하기 위해 { onlyOnce: true }가 적용되어야 합니다.');

  // 5. GA4 격리 및 피드 Falsy 0 버그 방어
  assert.match(script, /stats\.views !== undefined/, '조회수 0 카운트 누락을 방지하기 위해 !== undefined 검증이 있어야 합니다.');
  assert.match(script, /stats\.likes !== undefined/, '좋아요 0 카운트 누락을 방지하기 위해 !== undefined 검증이 있어야 합니다.');
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
    protocolId: 'PS-TEST-01',
    category: 'WATER',
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
    fatalMistakes: [],
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  };
  const heroHtml = renderHeroSection(mockProtocol);
  assert.match(heroHtml, /id="proto-views-count"/, '조회수 카운터 ID가 존재해야 합니다.');
  assert.match(heroHtml, /tabular-nums/, '히어로 조회수 뱃지에 CLS 방어 tabular-nums가 있어야 합니다.');

  // ProtocolCard
  const cardHtml = renderProtocolCard(mockProtocol);
  assert.match(cardHtml, /data-feed-views="PS-TEST-01"/, '피드 조회수 속성이 있어야 합니다.');
  assert.match(cardHtml, /data-feed-likes="PS-TEST-01"/, '피드 좋아요 속성이 있어야 합니다.');
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
  assert.ok(rules.rules.protocol_stats.$protocolId.views['.write'].includes('newData.isNumber()'), 'views .write 규칙에 isNumber() 검증이 있어야 합니다.');
  assert.ok(rules.rules.protocol_stats.$protocolId.likes['.write'].includes('newData.isNumber()'), 'likes .write 규칙에 isNumber() 검증이 있어야 합니다.');
  assert.equal(rules.rules.protocol_stats.$protocolId.$other['.write'], false, '$other는 .write: false로 차단되어야 합니다.');

  const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  assert.equal(fbConfig.database.rules, 'database.rules.json', 'firebase.json이 database.rules.json을 참조해야 합니다.');
});
