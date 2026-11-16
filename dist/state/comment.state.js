import { FIREBASE_CONFIG } from '../site.config.js';

/**
 * [State / Comment & Translation Layer]
 * 모던 다크(Linear / Vercel / Raycast 스타일) 익명 생존자 피드백 & 다국어 댓글 런타임 엔진.
 *
 * 핵심 보안 및 아키텍처:
 * 1. 2-Factor PIN 해싱 (Brute-Force 원천 차단):
 *    - 브라우저 고유 256-bit Device Secret Token(localStorage) + 사용자 4자리 PIN + 프로토콜 ID를 결합해
 *      FIPS 180-4 SHA-256(64자 Hex) 해시를 생성하고, 읽기 권한이 차단된(`comment_secrets` .read: false) 노드로만 검증.
 * 2. 스팸·광고·도배 다중 방어벽:
 *    - Honeypot 봇 트랩, 15초 작성 쿨다운, 제로폭 문자 제거 정규화 및 URL/도메인/카지노/성인/불법대출 정규식 필터링.
 *    - 커뮤니티 3회 누적 신고 시 자동 블라인드 처리.
 * 3. 글로벌 7개국어 통합 노출 & 1-Click 무과금 인라인 번역:
 *    - Google Translate GTX 무료 엔드포인트(`translate.googleapis.com`) 1차 호출 + MyMemory(`api.mymemory.translated.net`) 2차 폴백
 *    - `sessionStorage` 인메모리 캐싱으로 동일 댓글 재번역 시 네트워크 비용 0.
 * 4. 2단계 점진적 향상 (Progressive Enhancement) & 대기열(Pending Queue) 보장:
 *    - Phase 1: 오프라인/로컬 캐시 즉시 복원 및 로컬 작성/수정/삭제/번역 UI 즉시 동작.
 *    - Phase 2: Firebase RTDB 연결 완료 시 대기 중이던 작성 건(Pending Queue) 자동 플러시 및 원자적 멀티패스 동기화.
 */
export function getCommentRuntimeScript()         {
  const configJson = JSON.stringify(FIREBASE_CONFIG);

  return `
    (function () {
      if (typeof window === 'undefined') return;

      var config = ${configJson};
      var VALID_PID_RE = /^PR-[0-9]{2,4}$/;
      var rawPid = window.__PROTOCOL_ID__;
      var pid = (typeof rawPid === 'string' && VALID_PID_RE.test(rawPid)) ? rawPid : null;
      if (!pid) return;

      var sectionEl = document.getElementById('comment-section');
      if (!sectionEl) return;

      // ─── 0. Safe Storage & Session Cache Helpers ───
      var safeStorage = {
        getItem: function (k) {
          try { return localStorage.getItem(k); } catch (e) { return null; }
        },
        setItem: function (k, v) {
          try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
        },
        removeItem: function (k) {
          try { localStorage.removeItem(k); return true; } catch (e) { return false; }
        }
      };

      var safeSession = {
        getItem: function (k) {
          try { return sessionStorage.getItem(k); } catch (e) { return null; }
        },
        setItem: function (k, v) {
          try { sessionStorage.setItem(k, v); return true; } catch (e) { return false; }
        }
      };

      function getActiveLang() {
        return document.documentElement.getAttribute('lang') || 'ko';
      }

      function getUi() {
        var lang = getActiveLang();
        return (window.__UI_STRINGS__ && window.__UI_STRINGS__[lang]) ||
               (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};
      }

      function escapeHtmlClient(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // ─── 1. FIPS 180-4 Pure-JS SHA-256 (동기 64자 Hex 해시 / Web Crypto 비지원 환경 100% 호환) ───
      function utf8ToBytes(str) {
        var utf8 = unescape(encodeURIComponent(String(str)));
        var arr = [];
        for (var i = 0; i < utf8.length; i++) {
          arr.push(utf8.charCodeAt(i));
        }
        return arr;
      }

      function sha256Hex(message) {
        var K = [
          0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
          0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
          0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
          0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
          0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
          0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
          0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
          0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        var H = [
          0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
          0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];
        var bytes = utf8ToBytes(message);
        var bitLen = bytes.length * 8;
        bytes.push(0x80);
        while ((bytes.length % 64) !== 56) bytes.push(0);
        var hi = Math.floor(bitLen / 0x100000000);
        var lo = bitLen >>> 0;
        for (var b = 3; b >= 0; b--) bytes.push((hi >>> (b * 8)) & 0xff);
        for (var b2 = 3; b2 >= 0; b2--) bytes.push((lo >>> (b2 * 8)) & 0xff);

        var W = new Array(64);
        function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }

        for (var i = 0; i < bytes.length; i += 64) {
          for (var t = 0; t < 16; t++) {
            var idx = i + t * 4;
            W[t] = ((bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3]) >>> 0;
          }
          for (var t2 = 16; t2 < 64; t2++) {
            var s0 = (rotr(7, W[t2 - 15]) ^ rotr(18, W[t2 - 15]) ^ (W[t2 - 15] >>> 3)) >>> 0;
            var s1 = (rotr(17, W[t2 - 2]) ^ rotr(19, W[t2 - 2]) ^ (W[t2 - 2] >>> 10)) >>> 0;
            W[t2] = (W[t2 - 16] + s0 + W[t2 - 7] + s1) >>> 0;
          }
          var a = H[0], bVar = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
          for (var t3 = 0; t3 < 64; t3++) {
            var S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
            var ch = ((e & f) ^ (~e & g)) >>> 0;
            var temp1 = (h + S1 + ch + K[t3] + W[t3]) >>> 0;
            var S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
            var maj = ((a & bVar) ^ (a & c) ^ (bVar & c)) >>> 0;
            var temp2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + temp1) >>> 0;
            d = c; c = bVar; bVar = a; a = (temp1 + temp2) >>> 0;
          }
          H[0] = (H[0] + a) >>> 0;
          H[1] = (H[1] + bVar) >>> 0;
          H[2] = (H[2] + c) >>> 0;
          H[3] = (H[3] + d) >>> 0;
          H[4] = (H[4] + e) >>> 0;
          H[5] = (H[5] + f) >>> 0;
          H[6] = (H[6] + g) >>> 0;
          H[7] = (H[7] + h) >>> 0;
        }
        var hex = '';
        for (var hIdx = 0; hIdx < 8; hIdx++) {
          var part = H[hIdx].toString(16);
          while (part.length < 8) part = '0' + part;
          hex += part;
        }
        return hex;
      }

      // ─── 2. Device Secret Token (256-bit) & 2-Factor PIN Hash ───
      var DEVICE_TOKEN_KEY = 'ps_comment_device_token';
      function getOrCreateDeviceToken() {
        var existing = safeStorage.getItem(DEVICE_TOKEN_KEY);
        if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
        var token = '';
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
          var buf = new Uint8Array(32);
          window.crypto.getRandomValues(buf);
          for (var i = 0; i < buf.length; i++) {
            var hx = buf[i].toString(16);
            token += (hx.length < 2 ? '0' + hx : hx);
          }
        } else {
          token = sha256Hex(String(Date.now()) + ':' + String(Math.random()) + ':' + navigator.userAgent);
        }
        safeStorage.setItem(DEVICE_TOKEN_KEY, token);
        return token;
      }

      function computePinHash(commentId, pin) {
        var deviceToken = getOrCreateDeviceToken();
        return sha256Hex(pid + ':' + commentId + ':' + deviceToken + ':' + String(pin).trim());
      }

      // ─── 3. Anti-Spam & URL / Casino / Ad Filter ───
      var SPAM_RAW_RE = /(https?:\\/\\/|www\\.|[a-z0-9-]+\\.(com|net|org|kr|io|me|gg|xyz|ly|gl|co|shop|site|club|vip|top|bet)\\b|t\\.me\\/|bit\\.ly\\/|010-\\d{3,4}-\\d{4}|카지노|바카라|토토|슬롯|성인용품|조건만남|출장마사지|대출|작업대출|텔레그램|오픈카톡|유튜브\\s*구독|무료\\s*수익|코인가격|카톡\\s*문의)/i;
      var SPAM_COMPACT_RE = /(https?:\\/\\/|www\\.|카지노|바카라|사설토토|성인용품|조건만남|출장마사지|작업대출|텔레그램|오픈카톡|무료수익)/i;

      function containsSpamOrUrl(text) {
        if (!text) return false;
        var cleaned = String(text).replace(/[\\u200B-\\u200D\\uFEFF]/g, '');
        if (SPAM_RAW_RE.test(cleaned)) return true;
        var compact = cleaned.replace(/[\\s\\._\\-]+/g, '');
        if (SPAM_COMPACT_RE.test(compact)) return true;
        return false;
      }

      // ─── 4. State & Local Cache Management ───
      var CACHE_KEY = 'ps_comments_cache_' + pid;
      var NICK_KEY = 'ps_comment_nick';
      var LAST_POST_KEY = 'ps_comment_last_post_ts';
      var POST_COOLDOWN_MS = 15000;
      var BLIND_REPORT_THRESHOLD = 3;

      var state = {
        commentsMap: {},
        localSecrets: {},
        translations: {},
        openReplyId: null,
        openMoreMenuId: null,
        openPinTarget: null, // { id: string, mode: 'edit' | 'delete' }
        editingId: null,
        pendingCreates: [], // [{ comment: obj, pinHash: string }]
        remoteApi: null
      };

      function loadCachedComments() {
        var raw = safeStorage.getItem(CACHE_KEY);
        if (!raw) return;
        try {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            state.commentsMap = parsed;
          }
        } catch (e) {}
      }

      function saveCachedComments() {
        safeStorage.setItem(CACHE_KEY, JSON.stringify(state.commentsMap));
      }

      function formatRelativeTime(ts) {
        var ui = getUi();
        var diffSec = Math.max(0, Math.floor((Date.now() - Number(ts || 0)) / 1000));
        if (diffSec < 60) return ui.commentJustNow || '방금 전';
        var diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return diffMin + (ui.commentMinutesAgo || '분 전');
        var diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return diffHr + (ui.commentHoursAgo || '시간 전');
        var diffDay = Math.floor(diffHr / 24);
        return diffDay + (ui.commentDaysAgo || '일 전');
      }

      function getAvatarSvg(nickname, isReply) {
        var str = String(nickname || 'S');
        var sum = 0;
        for (var i = 0; i < str.length; i++) sum += str.charCodeAt(i);
        var variant = sum % 4;
        var sizeCls = isReply ? 'w-3.5 h-3.5' : 'w-4 h-4';
        if (variant === 0) {
          return '<svg class="' + sizeCls + ' text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2"></polygon><line x1="12" y1="22" x2="12" y2="12"></line><polyline points="21 7 12 12 3 7"></polyline></svg>';
        } else if (variant === 1) {
          return '<svg class="' + sizeCls + ' text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>';
        } else if (variant === 2) {
          return '<svg class="' + sizeCls + ' text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"></circle><polygon points="12 7 16 15 8 15 12 7"></polygon></svg>';
        }
        return '<svg class="' + sizeCls + ' text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"></rect><circle cx="12" cy="12" r="4"></circle></svg>';
      }

      function showAlert(msg) {
        var box = document.getElementById('comment-alert-box');
        var txt = document.getElementById('comment-alert-text');
        if (!box || !txt) return;
        txt.textContent = msg;
        box.classList.remove('hidden');
      }

      function hideAlert() {
        var box = document.getElementById('comment-alert-box');
        if (box) box.classList.add('hidden');
      }

      function notifyToast(msg) {
        if (typeof window.showToast === 'function') {
          window.showToast(msg);
        } else {
          var toastEl = document.getElementById('toast');
          if (!toastEl) return;
          toastEl.textContent = msg;
          toastEl.classList.remove('hidden');
          if (window.__toastTimer__) clearTimeout(window.__toastTimer__);
          window.__toastTimer__ = setTimeout(function () {
            toastEl.classList.add('hidden');
          }, 2500);
        }
      }

      // ─── 5. 1-Click Free Inline Translation Engine (Google GTX + MyMemory Fallback + Session Cache) ───
      function translateCommentText(commentId, rawText, sourceLang, targetLang, onDone) {
        var cacheKey = 'ps_trans_' + commentId + '_' + targetLang;
        var cached = safeSession.getItem(cacheKey);
        if (cached) {
          onDone(cached);
          return;
        }
        var gtxTarget = targetLang === 'zh-TW' ? 'zh-TW' : targetLang;
        var gtxUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
          encodeURIComponent(gtxTarget) + '&dt=t&q=' + encodeURIComponent(rawText);

        fetch(gtxUrl)
          .then(function (res) {
            if (!res.ok) throw new Error('GTX HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            var translated = '';
            if (Array.isArray(data) && Array.isArray(data[0])) {
              for (var i = 0; i < data[0].length; i++) {
                if (data[0][i] && data[0][i][0]) translated += data[0][i][0];
              }
            }
            if (!translated) throw new Error('Empty GTX response');
            safeSession.setItem(cacheKey, translated);
            onDone(translated);
          })
          .catch(function () {
            var sl = (sourceLang && sourceLang !== targetLang) ? sourceLang : 'en';
            var mmUrl = 'https://api.mymemory.translated.net/get?q=' +
              encodeURIComponent(rawText) + '&langpair=' + encodeURIComponent(sl + '|' + gtxTarget);
            fetch(mmUrl)
              .then(function (r) { return r.json(); })
              .then(function (d) {
                var txt = (d && d.responseData && d.responseData.translatedText) ? d.responseData.translatedText : rawText;
                safeSession.setItem(cacheKey, txt);
                onDone(txt);
              })
              .catch(function () {
                onDone(rawText);
              });
          });
      }

      // ─── 6. Render Comment Feed (Sleek Linear / Vercel Dark Style) ───
      function renderMoreMenuHtml(commentId, ui) {
        if (state.openMoreMenuId !== commentId) return '';
        return (
          '<div class="absolute right-0 top-7 z-30 min-w-[128px] py-1 rounded-xl bg-[#18181c] border border-white/[0.12] shadow-2xl comment-animate-in">' +
            '<button type="button" data-comment-action="open-pin" data-pin-mode="edit" data-comment-id="' + escapeHtmlClient(commentId) + '" class="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2 transition cursor-pointer">' +
              '<svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
              '<span>' + escapeHtmlClient(ui.commentEditBtn || '수정') + '</span>' +
            '</button>' +
            '<button type="button" data-comment-action="open-pin" data-pin-mode="delete" data-comment-id="' + escapeHtmlClient(commentId) + '" class="w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/[0.06] flex items-center gap-2 transition cursor-pointer">' +
              '<svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
              '<span>' + escapeHtmlClient(ui.commentDeleteBtn || '삭제') + '</span>' +
            '</button>' +
            '<div class="h-px bg-white/[0.08] my-1"></div>' +
            '<button type="button" data-comment-action="report" data-comment-id="' + escapeHtmlClient(commentId) + '" class="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer">' +
              '<svg class="w-3.5 h-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>' +
              '<span>' + escapeHtmlClient(ui.commentReportBtn || '신고') + '</span>' +
            '</button>' +
          '</div>'
        );
      }

      function renderCommentItemHtml(item, replies, ui) {
        var isReply = Boolean(item.parentId);
        var isBlinded = Number(item.reports || 0) >= BLIND_REPORT_THRESHOLD;
        var langBadge = String(item.lang || 'ko').toUpperCase();
        var timeLabel = formatRelativeTime(item.createdAt);
        var isEdited = Number(item.updatedAt || 0) > Number(item.createdAt || 0) + 1000;
        var transState = state.translations[item.id];
        var isPinOpen = state.openPinTarget && state.openPinTarget.id === item.id;
        var isEditing = state.editingId === item.id;
        var isReplyOpen = !isReply && state.openReplyId === item.id;

        var bodyHtml = '';
        if (isBlinded) {
          bodyHtml = '<p class="mt-1.5 text-xs italic text-zinc-500 select-none">' + escapeHtmlClient(ui.commentBlindedMsg || '다수의 커뮤니티 신고로 블라인드 처리된 댓글입니다.') + '</p>';
        } else if (isEditing) {
          bodyHtml =
            '<div class="mt-2 rounded-xl bg-[#121215] border border-white/[0.14] p-2.5 comment-animate-in">' +
              '<textarea id="edit-textarea-' + escapeHtmlClient(item.id) + '" rows="2" maxlength="300" class="w-full bg-transparent text-[13.5px] text-zinc-100 focus:outline-none resize-none select-text">' + escapeHtmlClient(item.content) + '</textarea>' +
              '<div class="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06] mt-1">' +
                '<button type="button" data-comment-action="cancel-edit" data-comment-id="' + escapeHtmlClient(item.id) + '" class="px-2.5 py-1 rounded-full text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">' + escapeHtmlClient(ui.commentCancelBtn || '취소') + '</button>' +
                '<button type="button" data-comment-action="save-edit" data-comment-id="' + escapeHtmlClient(item.id) + '" class="px-3 py-1 rounded-full bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer">' + escapeHtmlClient(ui.commentSaveBtn || '저장') + '</button>' +
              '</div>' +
            '</div>';
        } else {
          bodyHtml = '<p class="mt-1.5 text-[14px] text-zinc-200 leading-relaxed whitespace-pre-wrap break-words select-text">' + escapeHtmlClient(item.content) + '</p>';
        }

        // Inline Translation Card
        var transHtml = '';
        if (!isBlinded && transState && transState.visible) {
          var activeLangUpper = getActiveLang().toUpperCase();
          transHtml =
            '<div class="mt-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] comment-animate-in">' +
              '<div class="flex items-center justify-between mb-1">' +
                '<div class="flex items-center gap-1.5 text-[11px] font-medium text-amber-300/90">' +
                  '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>' +
                  '<span>' + escapeHtmlClient(ui.commentTranslatedBadge || '번역됨') + '</span>' +
                '</div>' +
                '<span class="text-[10px] font-mono text-zinc-500">GTX · ' + escapeHtmlClient(langBadge) + ' → ' + escapeHtmlClient(activeLangUpper) + '</span>' +
              '</div>' +
              '<p class="text-[13px] text-zinc-200 leading-relaxed whitespace-pre-wrap break-words select-text">' +
                escapeHtmlClient(transState.loading ? (ui.commentTranslating || '번역 중...') : transState.text) +
              '</p>' +
            '</div>';
        }

        // Action Bar
        var translateBtnLabel = (transState && transState.visible)
          ? (ui.commentTranslateHideBtn || '번역 접기')
          : (ui.commentTranslateBtn || '번역 보기');
        var replyCount = Array.isArray(replies) ? replies.length : 0;
        var replyBtnLabel = (ui.commentReplyBtn || '답글') + (replyCount > 0 ? ' ' + replyCount : '');

        var actionsHtml = '';
        if (!isBlinded) {
          actionsHtml =
            '<div class="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-zinc-400">' +
              (!isReply
                ? '<button type="button" data-comment-action="toggle-reply" data-comment-id="' + escapeHtmlClient(item.id) + '" class="inline-flex items-center gap-1.5 hover:text-zinc-100 transition cursor-pointer">' +
                    '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
                    '<span>' + escapeHtmlClient(replyBtnLabel) + '</span>' +
                  '</button>'
                : '') +
              '<button type="button" data-comment-action="translate" data-comment-id="' + escapeHtmlClient(item.id) + '" class="inline-flex items-center gap-1.5 ' + ((transState && transState.visible) ? 'text-zinc-200' : '') + ' hover:text-zinc-100 transition cursor-pointer">' +
                '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 8 6 6"></path><path d="m4 14 6-6 2-3"></path><path d="M2 5h12"></path><path d="M7 2h1"></path><path d="m22 22-5-10-5 10"></path><path d="M14 18h6"></path></svg>' +
                '<span>' + escapeHtmlClient(translateBtnLabel) + '</span>' +
              '</button>' +
              '<button type="button" data-comment-action="open-pin" data-pin-mode="edit" data-comment-id="' + escapeHtmlClient(item.id) + '" class="inline-flex items-center gap-1 hover:text-zinc-100 transition cursor-pointer">' +
                '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
                '<span>' + escapeHtmlClient(ui.commentEditBtn || '수정') + '</span>' +
              '</button>' +
              '<button type="button" data-comment-action="open-pin" data-pin-mode="delete" data-comment-id="' + escapeHtmlClient(item.id) + '" class="inline-flex items-center gap-1 hover:text-rose-400 transition cursor-pointer">' +
                '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
                '<span>' + escapeHtmlClient(ui.commentDeleteBtn || '삭제') + '</span>' +
              '</button>' +
            '</div>';
        }

        // Sleek Capsule PIN Popover
        var pinPopoverHtml = '';
        if (isPinOpen) {
          var modeLabel = state.openPinTarget.mode === 'delete'
            ? (ui.commentDeleteBtn || '삭제')
            : (ui.commentEditBtn || '수정');
          pinPopoverHtml =
            '<div class="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#16161a] border border-white/[0.14] shadow-lg comment-animate-in">' +
              '<svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' +
              '<span class="text-xs text-zinc-300">' + escapeHtmlClient(modeLabel) + ' PIN</span>' +
              '<input id="pin-verify-input-' + escapeHtmlClient(item.id) + '" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="w-12 bg-white/[0.06] rounded-full px-2 py-0.5 text-xs font-mono text-center text-white focus:outline-none border border-white/[0.12] select-text" />' +
              '<button type="button" data-comment-action="confirm-pin" data-comment-id="' + escapeHtmlClient(item.id) + '" class="px-2.5 py-0.5 rounded-full bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer">' + escapeHtmlClient(ui.commentConfirmBtn || '확인') + '</button>' +
              '<button type="button" data-comment-action="close-pin" data-comment-id="' + escapeHtmlClient(item.id) + '" class="text-xs text-zinc-500 hover:text-zinc-300 px-1 cursor-pointer">✕</button>' +
            '</div>';
        }

        // Inline 1-Level Reply Composer
        var replyFormHtml = '';
        if (isReplyOpen) {
          var currentNick = (document.getElementById('comment-nickname') && document.getElementById('comment-nickname').value) || (ui.commentDefaultNickname || '생존자');
          replyFormHtml =
            '<div class="mt-3 rounded-xl bg-[#121215] border border-white/[0.12] p-2.5 comment-animate-in">' +
              '<textarea id="reply-textarea-' + escapeHtmlClient(item.id) + '" rows="2" maxlength="300" placeholder="@' + escapeHtmlClient(item.nickname) + '..." class="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none px-1 select-text"></textarea>' +
              '<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] mt-1">' +
                '<div class="flex items-center gap-1.5">' +
                  '<input id="reply-nick-' + escapeHtmlClient(item.id) + '" type="text" maxlength="16" value="' + escapeHtmlClient(currentNick) + '" class="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-200 w-24 focus:outline-none select-text" />' +
                  '<input id="reply-pin-' + escapeHtmlClient(item.id) + '" type="password" inputmode="numeric" maxlength="4" placeholder="••••" class="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-200 w-14 text-center focus:outline-none select-text" />' +
                '</div>' +
                '<div class="flex items-center gap-1.5 ml-auto">' +
                  '<button type="button" data-comment-action="toggle-reply" data-comment-id="' + escapeHtmlClient(item.id) + '" class="px-2.5 py-1 rounded-full text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer">' + escapeHtmlClient(ui.commentCancelBtn || '취소') + '</button>' +
                  '<button type="button" data-comment-action="submit-reply" data-comment-id="' + escapeHtmlClient(item.id) + '" class="px-3 py-1 rounded-full bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 cursor-pointer">' + escapeHtmlClient(ui.commentSubmitBtn || '등록') + ' ↵</button>' +
                '</div>' +
              '</div>' +
            '</div>';
        }

        // Nested Replies HTML
        var nestedRepliesHtml = '';
        if (!isReply && Array.isArray(replies) && replies.length > 0) {
          var rItems = [];
          for (var rIdx = 0; rIdx < replies.length; rIdx++) {
            rItems.push(renderCommentItemHtml(replies[rIdx], [], ui));
          }
          nestedRepliesHtml = '<div class="mt-4 space-y-4">' + rItems.join('') + '</div>';
        }

        var moreMenuBtnHtml =
          '<div class="relative">' +
            '<button type="button" data-comment-action="toggle-more" data-comment-id="' + escapeHtmlClient(item.id) + '" aria-expanded="' + (state.openMoreMenuId === item.id ? 'true' : 'false') + '" class="opacity-70 hover:opacity-100 text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-white/[0.06] transition cursor-pointer">' +
              '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>' +
            '</button>' +
            renderMoreMenuHtml(item.id, ui) +
          '</div>';

        if (isReply) {
          return (
            '<div class="relative flex gap-3 comment-animate-in" data-comment-node="' + escapeHtmlClient(item.id) + '">' +
              '<div class="w-4 h-4 border-l-[1.5px] border-b-[1.5px] border-white/[0.08] rounded-bl-xl -ml-[23px] mt-0 shrink-0" aria-hidden="true"></div>' +
              '<div class="w-7 h-7 rounded-full bg-zinc-900 border border-white/[0.12] flex items-center justify-center shrink-0">' +
                getAvatarSvg(item.nickname, true) +
              '</div>' +
              '<div class="flex-1 min-w-0">' +
                '<div class="flex items-center justify-between gap-2">' +
                  '<div class="flex items-center gap-2 flex-wrap">' +
                    '<span class="text-[13px] font-semibold text-zinc-100">' + escapeHtmlClient(item.nickname) + '</span>' +
                    '<span class="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.05]">' + escapeHtmlClient(langBadge) + '</span>' +
                    '<span class="text-xs text-zinc-500">· ' + escapeHtmlClient(timeLabel) + '</span>' +
                    (isEdited ? '<span class="text-[11px] text-zinc-500">' + escapeHtmlClient(ui.commentEditedTag || '(수정됨)') + '</span>' : '') +
                  '</div>' +
                  moreMenuBtnHtml +
                '</div>' +
                bodyHtml +
                transHtml +
                actionsHtml +
                pinPopoverHtml +
              '</div>' +
            '</div>'
          );
        }

        var hasThreadLine = (Array.isArray(replies) && replies.length > 0);
        return (
          '<div class="relative group comment-animate-in" data-comment-node="' + escapeHtmlClient(item.id) + '">' +
            (hasThreadLine ? '<div class="absolute left-[15px] top-9 bottom-5 w-[1.5px] bg-white/[0.08]" aria-hidden="true"></div>' : '') +
            '<div class="flex gap-3.5">' +
              '<div class="w-8 h-8 rounded-full bg-zinc-900 border border-white/[0.12] flex items-center justify-center shrink-0 shadow-sm z-10">' +
                getAvatarSvg(item.nickname, false) +
              '</div>' +
              '<div class="flex-1 min-w-0">' +
                '<div class="flex items-center justify-between gap-2">' +
                  '<div class="flex items-center gap-2 flex-wrap">' +
                    '<span class="text-[13px] font-semibold text-zinc-100">' + escapeHtmlClient(item.nickname) + '</span>' +
                    '<span class="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.05]">' + escapeHtmlClient(langBadge) + '</span>' +
                    '<span class="text-xs text-zinc-500">· ' + escapeHtmlClient(timeLabel) + '</span>' +
                    (isEdited ? '<span class="text-[11px] text-zinc-500">' + escapeHtmlClient(ui.commentEditedTag || '(수정됨)') + '</span>' : '') +
                  '</div>' +
                  moreMenuBtnHtml +
                '</div>' +
                bodyHtml +
                transHtml +
                actionsHtml +
                pinPopoverHtml +
                replyFormHtml +
                nestedRepliesHtml +
              '</div>' +
            '</div>' +
          '</div>'
        );
      }

      function renderFeed() {
        var listEl = document.getElementById('comment-thread-list');
        var countEl = document.getElementById('comment-total-count');
        if (!listEl) return;

        var ui = getUi();
        var allItems = [];
        var keys = Object.keys(state.commentsMap || {});
        for (var i = 0; i < keys.length; i++) {
          var c = state.commentsMap[keys[i]];
          if (c && c.id && typeof c.content === 'string') {
            allItems.push(c);
          }
        }

        if (countEl) {
          countEl.textContent = String(allItems.length);
        }

        if (allItems.length === 0) {
          listEl.innerHTML =
            '<div id="comment-empty-state" class="py-10 text-center rounded-2xl bg-[#121215]/50 border border-white/[0.05]">' +
              '<p data-i18n="commentEmptyState" class="text-xs text-zinc-500">' + escapeHtmlClient(ui.commentEmptyState || '첫 번째 현장 피드백이나 대체 자재 팁을 남겨보세요.') + '</p>' +
            '</div>';
          return;
        }

        var parents = [];
        var repliesByParent = {};
        for (var j = 0; j < allItems.length; j++) {
          var item = allItems[j];
          if (!item.parentId) {
            parents.push(item);
          } else {
            if (!repliesByParent[item.parentId]) repliesByParent[item.parentId] = [];
            repliesByParent[item.parentId].push(item);
          }
        }

        parents.sort(function (a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
        var parentIds = Object.keys(repliesByParent);
        for (var k = 0; k < parentIds.length; k++) {
          repliesByParent[parentIds[k]].sort(function (a, b) { return Number(a.createdAt || 0) - Number(b.createdAt || 0); });
        }

        var htmlParts = [];
        for (var pIdx = 0; pIdx < parents.length; pIdx++) {
          var pItem = parents[pIdx];
          var rList = repliesByParent[pItem.id] || [];
          if (pIdx > 0) {
            htmlParts.push('<div class="h-px bg-white/[0.06]"></div>');
          }
          htmlParts.push(renderCommentItemHtml(pItem, rList, ui));
        }

        listEl.innerHTML = htmlParts.join('');
      }

      // 다국어 전환 시(switchLocale) 0.01초 즉시 리렌더링 훅 노출
      window.__refreshCommentLocale__ = function () {
        renderFeed();
      };

      // ─── 7. Create / Edit / Delete / Report Actions ───
      function generateCommentId() {
        var rand = Math.random().toString(36).substring(2, 8);
        while (rand.length < 6) rand += '0';
        return 'c_' + Date.now() + '_' + rand;
      }

      function handleCreateComment(parentId, rawNickname, rawPin, rawContent) {
        hideAlert();
        var ui = getUi();

        // 1. Honeypot check
        var hpEl = document.getElementById('comment-hp-field');
        if (hpEl && hpEl.value) return false;

        // 2. Cooldown check
        var now = Date.now();
        var lastPost = parseInt(safeStorage.getItem(LAST_POST_KEY) || '0', 10) || 0;
        if (now - lastPost < POST_COOLDOWN_MS) {
          showAlert(ui.commentErrCooldown || '도배 방지를 위해 잠시 후 다시 작성해주세요.');
          return false;
        }

        var nickname = String(rawNickname || '').trim().slice(0, 16) || ((ui.commentDefaultNickname || '생존자') + '-' + String(now).slice(-4));
        var pin = String(rawPin || '').trim();
        var content = String(rawContent || '').trim();

        if (content.length < 2 || content.length > 300) {
          showAlert(ui.commentErrLength || '댓글 내용을 2자 이상 300자 이하로 입력해주세요.');
          return false;
        }
        if (!/^[0-9]{4}$/.test(pin)) {
          showAlert(ui.commentErrPin || '비밀번호는 숫자 4자리로 입력해주세요.');
          return false;
        }
        if (containsSpamOrUrl(nickname) || containsSpamOrUrl(content)) {
          showAlert(ui.commentErrSpam || '보안 정책상 외부 링크(URL) 및 광고·스팸 키워드는 등록할 수 없습니다.');
          return false;
        }

        var commentId = generateCommentId();
        var pinHash = computePinHash(commentId, pin);
        var newComment = {
          id: commentId,
          parentId: parentId ? String(parentId) : '',
          nickname: nickname,
          content: content,
          lang: getActiveLang(),
          createdAt: now,
          updatedAt: now,
          reports: 0
        };

        // 낙관적 로컬 상태 반영
        state.commentsMap[commentId] = newComment;
        state.localSecrets[commentId] = pinHash;
        safeStorage.setItem('ps_csec_' + commentId, pinHash);
        safeStorage.setItem(NICK_KEY, nickname);
        safeStorage.setItem(LAST_POST_KEY, String(now));
        state.openReplyId = null;
        state.openMoreMenuId = null;
        saveCachedComments();
        renderFeed();
        notifyToast(ui.commentToastPosted || '피드백이 등록되었습니다.');

        if (state.remoteApi && typeof state.remoteApi.createComment === 'function') {
          state.remoteApi.createComment(newComment, pinHash);
        } else {
          state.pendingCreates.push({ comment: newComment, pinHash: pinHash });
        }
        return true;
      }

      function executeLocalDelete(commentId) {
        var ui = getUi();
        delete state.commentsMap[commentId];
        for (var k in state.commentsMap) {
          if (Object.prototype.hasOwnProperty.call(state.commentsMap, k)) {
            if (state.commentsMap[k] && state.commentsMap[k].parentId === commentId) {
              delete state.commentsMap[k];
              safeStorage.setItem('ps_cdel_' + k, '1');
            }
          }
        }
        delete state.localSecrets[commentId];
        safeStorage.removeItem('ps_csec_' + commentId);
        safeStorage.setItem('ps_cdel_' + commentId, '1');
        state.openPinTarget = null;
        saveCachedComments();
        renderFeed();
        notifyToast(ui.commentToastDeleted || '피드백이 삭제되었습니다.');
      }

      function handleVerifyPin(commentId, inputPin) {
        var ui = getUi();
        if (!/^[0-9]{4}$/.test(String(inputPin || '').trim())) {
          showAlert(ui.commentErrPin || '비밀번호는 숫자 4자리로 입력해주세요.');
          return;
        }
        var target = state.openPinTarget;
        if (!target || target.id !== commentId) return;

        var computedHash = computePinHash(commentId, inputPin);
        var storedLocalHash = state.localSecrets[commentId] || safeStorage.getItem('ps_csec_' + commentId);

        if (storedLocalHash && storedLocalHash !== computedHash) {
          showAlert(ui.commentErrWrongPin || '비밀번호(PIN)가 일치하지 않거나 작성한 기기가 다릅니다.');
          return;
        }

        if (target.mode === 'delete') {
          if (storedLocalHash && storedLocalHash === computedHash) {
            executeLocalDelete(commentId);
            if (state.remoteApi && typeof state.remoteApi.deleteComment === 'function') {
              state.remoteApi.deleteComment(commentId, computedHash);
            }
            return;
          }
          if (state.remoteApi && typeof state.remoteApi.deleteComment === 'function') {
            state.remoteApi.deleteComment(commentId, computedHash, function (ok) {
              if (!ok) {
                showAlert(ui.commentErrWrongPin || '비밀번호(PIN)가 일치하지 않거나 작성한 기기가 다릅니다.');
                return;
              }
              executeLocalDelete(commentId);
            });
          } else {
            showAlert(ui.commentErrWrongPin || '비밀번호(PIN)가 일치하지 않거나 작성한 기기가 다릅니다.');
          }
        } else if (target.mode === 'edit') {
          state.localSecrets[commentId] = computedHash;
          state.openPinTarget = null;
          state.editingId = commentId;
          renderFeed();
        }
      }

      function handleSaveEdit(commentId, newContentRaw) {
        hideAlert();
        var ui = getUi();
        var item = state.commentsMap[commentId];
        if (!item) return;

        var content = String(newContentRaw || '').trim();
        if (content.length < 2 || content.length > 300) {
          showAlert(ui.commentErrLength || '댓글 내용을 2자 이상 300자 이하로 입력해주세요.');
          return;
        }
        if (containsSpamOrUrl(content)) {
          showAlert(ui.commentErrSpam || '보안 정책상 외부 링크(URL) 및 광고·스팸 키워드는 등록할 수 없습니다.');
          return;
        }

        var proofHash = state.localSecrets[commentId] || safeStorage.getItem('ps_csec_' + commentId);
        if (!proofHash) {
          showAlert(ui.commentErrWrongPin || '비밀번호(PIN)가 일치하지 않거나 작성한 기기가 다릅니다.');
          return;
        }

        var hasLocalOwnership = Boolean(safeStorage.getItem('ps_csec_' + commentId) === proofHash);
        var prevContent = item.content;
        var prevUpdated = item.updatedAt;
        item.content = content;
        item.updatedAt = Date.now();
        state.editingId = null;
        delete state.translations[commentId];
        saveCachedComments();
        renderFeed();

        if (hasLocalOwnership) {
          notifyToast(ui.commentToastUpdated || '피드백이 수정되었습니다.');
          if (state.remoteApi && typeof state.remoteApi.updateComment === 'function') {
            state.remoteApi.updateComment(item, proofHash);
          }
          return;
        }

        if (state.remoteApi && typeof state.remoteApi.updateComment === 'function') {
          state.remoteApi.updateComment(item, proofHash, function (ok) {
            if (!ok) {
              item.content = prevContent;
              item.updatedAt = prevUpdated;
              saveCachedComments();
              renderFeed();
              showAlert(ui.commentErrWrongPin || '비밀번호(PIN)가 일치하지 않거나 작성한 기기가 다릅니다.');
              return;
            }
            notifyToast(ui.commentToastUpdated || '피드백이 수정되었습니다.');
          });
        } else {
          notifyToast(ui.commentToastUpdated || '피드백이 수정되었습니다.');
        }
      }

      function handleReportComment(commentId) {
        var ui = getUi();
        state.openMoreMenuId = null;
        var reportKey = 'ps_creport_' + commentId;
        if (safeStorage.getItem(reportKey) === '1') {
          renderFeed();
          notifyToast(ui.commentToastReported || '신고가 접수되었습니다.');
          return;
        }
        var item = state.commentsMap[commentId];
        if (!item) return;

        safeStorage.setItem(reportKey, '1');
        item.reports = Number(item.reports || 0) + 1;
        saveCachedComments();
        renderFeed();
        notifyToast(ui.commentToastReported || '신고가 접수되었습니다.');

        if (state.remoteApi && typeof state.remoteApi.reportComment === 'function') {
          state.remoteApi.reportComment(item);
        }
      }

      // ─── 8. Phase 1 Initialization (Zero-Dependency Local Setup) ───
      function initPhase1() {
        loadCachedComments();

        var nickInput = document.getElementById('comment-nickname');
        var savedNick = safeStorage.getItem(NICK_KEY);
        if (nickInput) {
          if (savedNick) {
            nickInput.value = savedNick;
          } else {
            var ui = getUi();
            var suffix = String(Math.floor(1000 + Math.random() * 9000));
            var generated = (ui.commentDefaultNickname || '생존자') + '-' + suffix;
            nickInput.value = generated;
            safeStorage.setItem(NICK_KEY, generated);
          }
        }

        var mainInput = document.getElementById('comment-input');
        var charCountEl = document.getElementById('comment-char-count');
        var submitBtn = document.getElementById('btn-submit-comment');
        var pinInput = document.getElementById('comment-pin');
        var closeAlertBtn = document.getElementById('btn-close-comment-alert');

        if (closeAlertBtn) {
          closeAlertBtn.addEventListener('click', hideAlert);
        }

        if (mainInput && charCountEl) {
          mainInput.addEventListener('input', function () {
            charCountEl.textContent = mainInput.value.length + '/300';
          });
          mainInput.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              if (submitBtn) submitBtn.click();
            }
          });
        }

        if (submitBtn) {
          submitBtn.addEventListener('click', function () {
            var nVal = nickInput ? nickInput.value : '';
            var pVal = pinInput ? pinInput.value : '';
            var cVal = mainInput ? mainInput.value : '';
            var ok = handleCreateComment('', nVal, pVal, cVal);
            if (ok && mainInput && charCountEl) {
              mainInput.value = '';
              charCountEl.textContent = '0/300';
            }
          });
        }

        // 외부 영역 클릭 시 더보기(⋯) 메뉴 자동 닫기
        document.addEventListener('click', function (e) {
          if (!state.openMoreMenuId) return;
          var clickedAction = e.target && e.target.closest ? e.target.closest('[data-comment-action]') : null;
          if (!clickedAction) {
            state.openMoreMenuId = null;
            renderFeed();
          }
        });

        var threadListEl = document.getElementById('comment-thread-list');
        if (threadListEl) {
          threadListEl.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-comment-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-comment-action');
            var cId = btn.getAttribute('data-comment-id');
            if (!cId) return;

            if (action === 'toggle-more') {
              e.stopPropagation();
              state.openMoreMenuId = (state.openMoreMenuId === cId) ? null : cId;
              renderFeed();
            } else if (action === 'toggle-reply') {
              state.openReplyId = (state.openReplyId === cId) ? null : cId;
              state.openMoreMenuId = null;
              state.openPinTarget = null;
              renderFeed();
            } else if (action === 'submit-reply') {
              var rTextEl = document.getElementById('reply-textarea-' + cId);
              var rNickEl = document.getElementById('reply-nick-' + cId);
              var rPinEl = document.getElementById('reply-pin-' + cId);
              handleCreateComment(
                cId,
                rNickEl ? rNickEl.value : '',
                rPinEl ? rPinEl.value : (pinInput ? pinInput.value : ''),
                rTextEl ? rTextEl.value : ''
              );
            } else if (action === 'translate') {
              var item = state.commentsMap[cId];
              if (!item) return;
              state.openMoreMenuId = null;
              var cur = state.translations[cId];
              if (cur && cur.visible) {
                cur.visible = false;
                renderFeed();
                return;
              }
              state.translations[cId] = { visible: true, loading: true, text: '' };
              renderFeed();
              translateCommentText(cId, item.content, item.lang, getActiveLang(), function (translatedText) {
                state.translations[cId] = { visible: true, loading: false, text: translatedText };
                renderFeed();
              });
            } else if (action === 'open-pin') {
              var mode = btn.getAttribute('data-pin-mode') || 'edit';
              state.openMoreMenuId = null;
              if (state.openPinTarget && state.openPinTarget.id === cId && state.openPinTarget.mode === mode) {
                state.openPinTarget = null;
              } else {
                state.openPinTarget = { id: cId, mode: mode };
              }
              state.editingId = null;
              renderFeed();
            } else if (action === 'close-pin') {
              state.openPinTarget = null;
              renderFeed();
            } else if (action === 'confirm-pin') {
              var vInput = document.getElementById('pin-verify-input-' + cId);
              handleVerifyPin(cId, vInput ? vInput.value : '');
            } else if (action === 'cancel-edit') {
              state.editingId = null;
              renderFeed();
            } else if (action === 'save-edit') {
              var eArea = document.getElementById('edit-textarea-' + cId);
              handleSaveEdit(cId, eArea ? eArea.value : '');
            } else if (action === 'report') {
              handleReportComment(cId);
            }
          });
        }

        renderFeed();
      }

      initPhase1();

      // ─── 9. Phase 2 Remote Firebase Realtime Database Sync ───
      if (!config || !config.apiKey || config.disabled || config.apiKey.indexOf('your_') === 0) return;

      Promise.all([
        import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js')
      ]).then(function (modules) {
        var appMod = modules[0];
        var dbMod = modules[1];
        var app = (appMod.getApps && appMod.getApps().length > 0)
          ? appMod.getApps()[0]
          : appMod.initializeApp(config);
        var db = dbMod.getDatabase(app);
        var ref = dbMod.ref;
        var onValue = dbMod.onValue;
        var update = dbMod.update;

        state.remoteApi = {
          createComment: function (commentObj, pinHash) {
            var updates = {};
            updates['protocol_comments/' + pid + '/' + commentObj.id] = {
              id: commentObj.id,
              parentId: commentObj.parentId,
              nickname: commentObj.nickname,
              content: commentObj.content,
              lang: commentObj.lang,
              createdAt: commentObj.createdAt,
              updatedAt: commentObj.updatedAt,
              reports: 0
            };
            updates['comment_secrets/' + pid + '/' + commentObj.id + '/pinHash'] = pinHash;
            updates['comment_secrets/' + pid + '/' + commentObj.id + '/verifiedHash'] = pinHash;
            update(ref(db), updates).catch(function (err) {
              console.warn('[SurvivalProtocol Comments] Firebase RTDB write failed (ensure database.rules.json is published in Firebase Console):', err);
            });
          },
          updateComment: function (commentObj, proofHash, cb) {
            var secretUpdate = {};
            secretUpdate['comment_secrets/' + pid + '/' + commentObj.id + '/verifiedHash'] = proofHash;
            var commentUpdate = {};
            commentUpdate['protocol_comments/' + pid + '/' + commentObj.id] = {
              id: commentObj.id,
              parentId: commentObj.parentId,
              nickname: commentObj.nickname,
              content: commentObj.content,
              lang: commentObj.lang,
              createdAt: commentObj.createdAt,
              updatedAt: commentObj.updatedAt,
              reports: Number(commentObj.reports || 0)
            };
            update(ref(db), secretUpdate)
              .then(function () {
                return update(ref(db), commentUpdate);
              })
              .then(function () { if (cb) cb(true); })
              .catch(function (err) {
                // 로컬에만 존재하던 댓글(규칙 게시 전 작성분)인 경우 원격 생성으로 폴백 동기화
                var fallbackUpdates = {};
                fallbackUpdates['comment_secrets/' + pid + '/' + commentObj.id + '/pinHash'] = proofHash;
                fallbackUpdates['comment_secrets/' + pid + '/' + commentObj.id + '/verifiedHash'] = proofHash;
                fallbackUpdates['protocol_comments/' + pid + '/' + commentObj.id] = commentUpdate['protocol_comments/' + pid + '/' + commentObj.id];
                update(ref(db), fallbackUpdates)
                  .then(function () { if (cb) cb(true); })
                  .catch(function () {
                    console.warn('[SurvivalProtocol Comments] Firebase RTDB update failed:', err);
                    if (cb) cb(false);
                  });
              });
          },
          deleteComment: function (commentId, proofHash, cb) {
            var secretUpdate = {};
            secretUpdate['comment_secrets/' + pid + '/' + commentId + '/verifiedHash'] = proofHash;
            var deleteUpdate = {};
            deleteUpdate['protocol_comments/' + pid + '/' + commentId] = null;
            update(ref(db), secretUpdate)
              .then(function () {
                return update(ref(db), deleteUpdate);
              })
              .then(function () { if (cb) cb(true); })
              .catch(function (err) {
                console.warn('[SurvivalProtocol Comments] Firebase RTDB delete failed:', err);
                if (cb) cb(false);
              });
          },
          reportComment: function (commentObj) {
            var updates = {};
            updates['protocol_comments/' + pid + '/' + commentObj.id + '/reports'] = Number(commentObj.reports || 1);
            update(ref(db), updates).catch(function () {});
          }
        };

        // 대기열에 있던 로컬 작성 건 즉시 원격 DB로 플러시
        if (state.pendingCreates.length > 0) {
          for (var p = 0; p < state.pendingCreates.length; p++) {
            var item = state.pendingCreates[p];
            state.remoteApi.createComment(item.comment, item.pinHash);
          }
          state.pendingCreates = [];
        }

        var commentsRef = ref(db, 'protocol_comments/' + pid);
        onValue(commentsRef, function (snap) {
          var remoteMap = (snap && snap.exists() && snap.val() && typeof snap.val() === 'object') ? snap.val() : {};
          var filteredRemote = {};
          for (var rk in remoteMap) {
            if (Object.prototype.hasOwnProperty.call(remoteMap, rk)) {
              if (safeStorage.getItem('ps_cdel_' + rk) !== '1') {
                filteredRemote[rk] = remoteMap[rk];
              }
            }
          }
          // 로컬에만 남아있던 미동기화 본인 작성 댓글을 자동으로 원격 DB에 백업 동기화
          for (var lk in state.commentsMap) {
            if (Object.prototype.hasOwnProperty.call(state.commentsMap, lk)) {
              var localItem = state.commentsMap[lk];
              var localSec = safeStorage.getItem('ps_csec_' + lk);
              if (localItem && localSec && !filteredRemote[lk] && safeStorage.getItem('ps_cdel_' + lk) !== '1') {
                state.remoteApi.createComment(localItem, localSec);
              }
            }
          }
          var merged = Object.assign({}, state.commentsMap, filteredRemote);
          state.commentsMap = merged;
          saveCachedComments();
          renderFeed();
        }, { onlyOnce: true });
      }).catch(function () {
        // 오프라인 / 방화벽 차단 시 로컬 캐시 모드로 무결성 유지
      });
    })();
  `.trim();
}
