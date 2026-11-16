import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_STRINGS } from '../src/i18n/ui-strings.ts';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../src/i18n/locales.ts';
import { renderCommentSection } from '../src/components/protocol/CommentSection.ts';
import { getCommentRuntimeScript } from '../src/state/comment.state.ts';
import { getLocaleRuntimeScript } from '../src/state/locale.state.ts';

test('Comment Suite 22-1: 7개 국어 UI_STRINGS 댓글·번역·보안 키 완결성 검증', () => {
  const requiredKeys = [
    'commentSectionTitle',
    'commentFeedBadge',
    'commentPlaceholder',
    'commentDefaultNickname',
    'commentNicknameAria',
    'commentPinAria',
    'commentSubmitBtn',
    'commentReplyBtn',
    'commentTranslateBtn',
    'commentTranslateHideBtn',
    'commentTranslating',
    'commentTranslatedBadge',
    'commentEditBtn',
    'commentDeleteBtn',
    'commentReportBtn',
    'commentCancelBtn',
    'commentConfirmBtn',
    'commentSaveBtn',
    'commentEmptyState',
    'commentOfflineNotice',
    'commentJustNow',
    'commentMinutesAgo',
    'commentHoursAgo',
    'commentDaysAgo',
    'commentEditedTag',
    'commentBlindedMsg',
    'commentErrLength',
    'commentErrPin',
    'commentErrSpam',
    'commentErrCooldown',
    'commentErrWrongPin',
    'commentToastPosted',
    'commentToastUpdated',
    'commentToastDeleted',
    'commentToastReported',
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

test('Comment Suite 22-2: renderCommentSection 모던 다크 UI 마크업 및 A11y/프린트 격리 검증', () => {
  const html = renderCommentSection('ko');

  assert.match(html, /id="comment-section"/, '댓글 섹션 루트 ID가 존재해야 합니다.');
  assert.match(html, /class="no-print\b/, 'A4 오프라인 인쇄 시 댓글 폼이 제외되도록 .no-print 클래스가 있어야 합니다.');
  assert.match(html, /#comment-section \.rounded-2xl/, '모던 라운드 서피스를 위한 스코프 CSS가 포함되어야 합니다.');
  assert.match(html, /#comment-section \.rounded-full/, '캡슐형 필(Pill) UI를 위한 스코프 CSS가 포함되어야 합니다.');
  assert.match(html, /id="comment-composer-card"/, '일체형 싱글 서피스 입력 카드 ID가 존재해야 합니다.');
  assert.match(html, /id="comment-input"/, '댓글 본문 textarea가 존재해야 합니다.');
  assert.match(html, /id="comment-nickname"/, '익명 닉네임 캡슐 입력창이 존재해야 합니다.');
  assert.match(html, /id="comment-pin"/, '4자리 PIN 캡슐 입력창이 존재해야 합니다.');
  assert.match(html, /maxlength="4"/, 'PIN 입력창은 4자리로 제한되어야 합니다.');
  assert.match(html, /id="comment-hp-field"/, '스팸 봇 차단용 허니팟(Honeypot) 필드가 존재해야 합니다.');
  assert.match(html, /id="btn-submit-comment"/, '댓글 등록 버튼이 존재해야 합니다.');
  assert.match(html, /id="comment-thread-list"/, '댓글 스레드 리스트 컨테이너가 존재해야 합니다.');
});

test('Comment Suite 22-3: getCommentRuntimeScript 구문 유효성, 2-Factor SHA-256, 스팸 차단, 번역 엔진 검증', () => {
  const script = getCommentRuntimeScript();

  assert.doesNotThrow(() => {
    new Function(script);
  }, '댓글 런타임 스크립트는 자바스크립트 구문 오류가 없어야 합니다.');

  // 1. 2-Factor SHA-256 해싱 및 기기 고유 토큰 검증
  assert.match(script, /function sha256Hex\(/, '순수 JS SHA-256 해시 함수가 내장되어야 합니다.');
  assert.match(script, /ps_comment_device_token/, '256-bit 기기 고유 시크릿 토큰 키가 포함되어야 합니다.');
  assert.match(script, /computePinHash/, '기기 토큰과 4자리 PIN을 결합하는 2-Factor 해시 함수가 있어야 합니다.');

  // 2. 스팸·URL·광고 필터 및 쿨다운·자동 블라인드 검증
  assert.match(script, /containsSpamOrUrl/, '클라이언트 URL/스팸 정규화 필터 함수가 존재해야 합니다.');
  assert.match(script, /POST_COOLDOWN_MS = 15000/, '도배 방지를 위한 작성 쿨다운이 설정되어야 합니다.');
  assert.match(script, /BLIND_REPORT_THRESHOLD = 3/, '3회 신고 누적 시 자동 블라인드 임계값이 설정되어야 합니다.');

  // 3. 무과금 1-Click 번역 엔진 (Google GTX + MyMemory 폴백 + 세션 캐시)
  assert.match(script, /translate\.googleapis\.com\/translate_a\/single/, 'Google GTX 무료 번역 엔드포인트가 포함되어야 합니다.');
  assert.match(script, /api\.mymemory\.translated\.net/, 'MyMemory 번역 폴백 엔드포인트가 포함되어야 합니다.');
  assert.match(script, /ps_trans_/, '세션 스토리지 번역 캐시 프리픽스가 존재해야 합니다.');

  // 4. 다국어 즉시 핫스왑 훅 연동 검증
  const localeScript = getLocaleRuntimeScript();
  assert.match(localeScript, /__refreshCommentLocale__/, '언어 전환 시 댓글 피드도 즉시 핫스왑되도록 훅이 연결되어야 합니다.');
});

test('Comment Suite 22-4: database.rules.json 댓글 보안 규칙(PIN 해시 비공개, 1단계 대댓글, 스팸 정규식) 검증', () => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const rulesPath = path.join(rootDir, 'database.rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));

  assert.ok(rules.rules.protocol_comments, 'protocol_comments 노드 규칙이 정의되어 있어야 합니다.');
  assert.ok(rules.rules.comment_secrets, 'comment_secrets 노드 규칙이 정의되어 있어야 합니다.');
  assert.equal(
    rules.rules.comment_secrets['.read'],
    false,
    '브루트포스 방어를 위해 comment_secrets는 반드시 .read: false여야 합니다.'
  );
  assert.ok(rules.rules.comment_ratelimit, 'comment_ratelimit 노드 규칙이 정의되어 있어야 합니다.');
  assert.equal(
    rules.rules.comment_ratelimit['.read'],
    false,
    'comment_ratelimit 노드는 .read: false여야 합니다.'
  );

  const commentValidate: string = rules.rules.protocol_comments.$protocolId.$commentId['.validate'];
  assert.ok(commentValidate.includes('https?:\\/\\/|www\\.'), '서버 규칙에서 외부 URL(http/https/www)을 원천 차단해야 합니다.');
  assert.ok(commentValidate.includes('parentId'), '1단계 대댓글 깊이 제한 검증이 포함되어야 합니다.');
});
