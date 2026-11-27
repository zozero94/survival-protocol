import { FIREBASE_CONFIG } from '../site.config.js';

                                                              

/**
 * [State / Telemetry Layer]
 * Firebase Realtime Database(고빈도 조회수/좋아요/댓글 집계) 및 GA4 방문자 분석 런타임 스크립트.
 * Stitch Utilitarian Brutalist 디자인 시스템 및 PWA 오프라인 무결성을 보장하며,
 * 2단계 점진적 향상(Progressive Enhancement) 아키텍처를 채택한다:
 *
 * 1단계 (Zero-Dependency Local Phase): CDN 로드 전 즉시 로컬스토리지 복원, 버튼 이벤트 바인딩, 낙관적 UI 렌더링.
 * 2단계 (Background Remote Telemetry Phase): requestIdleCallback 지연 로드, GA4 격리, { onlyOnce: true } 웹소켓 누수 방지.
 *
 * mode 분기('feed' | 'protocol' | 'all')를 통해 메인 피드와 상세 페이지 간 불필요한 데드코드를 제거한다.
 */
export function getFirebaseRuntimeScript(mode                      = 'all')         {
  const configJson = JSON.stringify(FIREBASE_CONFIG);
  const includeFeed = mode === 'all' || mode === 'feed';
  const includeProtocol = mode === 'all' || mode === 'protocol';

  const feedPhase1Block = includeFeed
    ? `
      var feedDomMap = null;
      function getFeedDomMap() {
        if (feedDomMap) return feedDomMap;
        feedDomMap = Object.create(null);
        var cards = document.querySelectorAll('[data-protocol-card]');
        for (var i = 0; i < cards.length; i++) {
          var card = cards[i];
          var protocolId = card.getAttribute('data-protocol-card');
          if (!protocolId || !VALID_PID_RE.test(protocolId)) continue;
          feedDomMap[protocolId] = {
            card: card,
            views: card.querySelector('[data-feed-views]'),
            likes: card.querySelector('[data-feed-likes]'),
            comments: card.querySelector('[data-feed-comments]')
          };
        }
        return feedDomMap;
      }

      function countValidComments(commentsById) {
        if (!commentsById || typeof commentsById !== 'object' || Array.isArray(commentsById)) return 0;
        var keys = Object.keys(commentsById);
        var validCount = 0;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (safeStorage.getItem('ps_cdel_' + key) === '1') continue;
          var comment = commentsById[key];
          if (!comment || typeof comment !== 'object' || !comment.id || typeof comment.content !== 'string') continue;
          var isReply = Boolean(comment.parentId);
          if (isReply) {
            var parentId = String(comment.parentId);
            var hasOwnParent = parentId !== key && Object.prototype.hasOwnProperty.call(commentsById, parentId);
            if (!hasOwnParent || safeStorage.getItem('ps_cdel_' + parentId) === '1') continue;
            var parentComment = commentsById[parentId];
            if (!parentComment || typeof parentComment !== 'object' || !parentComment.id || typeof parentComment.content !== 'string' || parentComment.parentId) continue;
          }
          validCount++;
        }
        return validCount;
      }

      function applyFeedMetric(protocolId, fieldName, numVal) {
        if (!VALID_PID_RE.test(protocolId)) return;
        var safeNum = sanitizeMetric(numVal);
        var entry = getFeedDomMap()[protocolId];
        if (entry) {
          if (entry[fieldName]) {
            entry[fieldName].textContent = formatNumber(safeNum);
          }
          entry.card.setAttribute('data-' + fieldName, String(safeNum));
          return;
        }
        var el = document.querySelector('[data-feed-' + fieldName + '="' + protocolId + '"]');
        if (el) {
          el.textContent = formatNumber(safeNum);
        }
        var cardEl = document.querySelector('[data-protocol-card="' + protocolId + '"]');
        if (cardEl) {
          cardEl.setAttribute('data-' + fieldName, String(safeNum));
        }
      }

      function refreshFeedSortIfAvailable(changedFields) {
        if (typeof window.__refreshFeedSort__ === 'function') {
          window.__refreshFeedSort__(changedFields);
        }
      }

      function hydrateFeedMetricsFromCache() {
        var cacheObj = readFeedMetricsCache();
        var domMap = getFeedDomMap();
        var pidList = Object.keys(domMap);
        if (pidList.length === 0) {
          var viewEls = document.querySelectorAll('[data-feed-views]');
          for (var j = 0; j < viewEls.length; j++) {
            var fallbackPid = viewEls[j].getAttribute('data-feed-views');
            if (fallbackPid && VALID_PID_RE.test(fallbackPid)) pidList.push(fallbackPid);
          }
        }
        for (var i = 0; i < pidList.length; i++) {
          var protocolId = pidList[i];
          var entry = cacheObj[protocolId];
          if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            if (entry.v !== undefined) applyFeedMetric(protocolId, 'views', entry.v);
            if (entry.l !== undefined) applyFeedMetric(protocolId, 'likes', entry.l);
            if (entry.c !== undefined) applyFeedMetric(protocolId, 'comments', entry.c);
          }
        }
        refreshFeedSortIfAvailable();
      }
    `
    : '';

  const protocolPhase1Block = includeProtocol
    ? `
      var CLICK_COOLDOWN_MS = 1200;
      var MAX_TOGGLES_PER_SESSION = 6;
      var lastLikeClickTime = 0;
      var sessionToggleCount = 0;

      var localState = {
        isLiked: false,
        pendingDelta: 0,
        renderLikeButtonState: null,
        syncRemote: null
      };

      function getToastMessage(isLiked) {
        var lang = document.documentElement.getAttribute('lang') || 'ko';
        var strings = (window.__UI_STRINGS__ && window.__UI_STRINGS__[lang]) || (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};
        return isLiked
          ? (strings.toastLiked || '생존 기술 유용성을 확인했습니다.')
          : (strings.toastUnliked || '생존 확인이 취소되었습니다.');
      }

      function showToast(msg) {
        var toastEl = document.getElementById('toast');
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.remove('hidden');
        if (window.__toastTimer__) clearTimeout(window.__toastTimer__);
        window.__toastTimer__ = setTimeout(function () {
          toastEl.classList.add('hidden');
        }, 2500);
      }

      function initLocalProtocolUI(protocolId) {
        var likeBtn = document.getElementById('btn-like-protocol');
        var likeIcon = document.getElementById('icon-like');
        var likesEl = document.getElementById('proto-likes-count');
        var likedStorageKey = 'ps_liked_' + protocolId;

        localState.isLiked = safeStorage.getItem(likedStorageKey) === '1';

        function renderLikeButtonState(liked) {
          if (!likeBtn) return;
          likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
          if (liked) {
            likeBtn.classList.remove('bg-[#191919]', 'text-[#999]', 'border-[#333]');
            likeBtn.classList.add('bg-[#1f1d13]', 'text-[#fde68a]', 'border-[#fde68a]');
            if (likeIcon) {
              likeIcon.setAttribute('fill', '#fde68a');
              likeIcon.setAttribute('stroke', '#fde68a');
            }
          } else {
            likeBtn.classList.remove('bg-[#1f1d13]', 'text-[#fde68a]', 'border-[#fde68a]');
            likeBtn.classList.add('bg-[#191919]', 'text-[#999]', 'border-[#333]');
            if (likeIcon) {
              likeIcon.setAttribute('fill', 'none');
              likeIcon.setAttribute('stroke', 'currentColor');
            }
          }
        }

        localState.renderLikeButtonState = renderLikeButtonState;
        renderLikeButtonState(localState.isLiked);

        if (likeBtn) {
          likeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var nowClick = Date.now();
            if (nowClick - lastLikeClickTime < CLICK_COOLDOWN_MS) return;
            if (sessionToggleCount >= MAX_TOGGLES_PER_SESSION) return;
            lastLikeClickTime = nowClick;
            sessionToggleCount++;

            var targetState = !localState.isLiked;
            localState.isLiked = targetState;

            if (targetState) {
              safeStorage.setItem(likedStorageKey, '1');
            } else {
              safeStorage.removeItem(likedStorageKey);
            }

            renderLikeButtonState(targetState);

            if (likesEl) {
              var currentNum = parseInt((likesEl.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
              var nextNum = targetState ? currentNum + 1 : Math.max(0, currentNum - 1);
              likesEl.textContent = formatNumber(nextNum);
              patchFeedMetricsCache(protocolId, { l: nextNum });
            }

            showToast(getToastMessage(targetState));

            if (typeof localState.syncRemote === 'function') {
              localState.syncRemote(targetState);
            } else {
              localState.pendingDelta += (targetState ? 1 : -1);
            }
          });
        }
      }
    `
    : '';

  const phase1InitCall =
    mode === 'protocol'
      ? `if (pid) { initLocalProtocolUI(pid); }`
      : mode === 'feed'
        ? `
          hydrateFeedMetricsFromCache();
          if (typeof window.addEventListener === 'function') {
            window.addEventListener('pageshow', function (e) {
              if (e && e.persisted) hydrateFeedMetricsFromCache();
            });
          }
        `
        : `
          if (pid) {
            initLocalProtocolUI(pid);
          } else {
            hydrateFeedMetricsFromCache();
            if (typeof window.addEventListener === 'function') {
              window.addEventListener('pageshow', function (e) {
                if (e && e.persisted) hydrateFeedMetricsFromCache();
              });
            }
          }
        `;

  const feedPhase2Block = includeFeed
    ? `
      function initFeedRemote(db, ref, onValue) {
        var domMap = getFeedDomMap();
        var activePids = Object.keys(domMap);
        if (activePids.length === 0) {
          var viewEls = document.querySelectorAll('[data-feed-views]');
          var seenMap = Object.create(null);
          for (var i = 0; i < viewEls.length; i++) {
            var pidAttr = viewEls[i].getAttribute('data-feed-views');
            if (!pidAttr || !VALID_PID_RE.test(pidAttr) || seenMap[pidAttr]) continue;
            seenMap[pidAttr] = true;
            activePids.push(pidAttr);
          }
        }
        if (activePids.length === 0) return;

        // TTL(5분) 이내이고 전체 카드 지표가 캐시에 모두 있으면 원격 RTDB 재조회 생략
        var existingCache = readFeedMetricsCache();
        var isCacheFresh = Boolean(existingCache._ts && (Date.now() - existingCache._ts) < FEED_METRICS_TTL_MS);
        if (isCacheFresh) {
          var allCovered = true;
          for (var cIdx = 0; cIdx < activePids.length; cIdx++) {
            var entry = existingCache[activePids[cIdx]];
            if (!entry || entry.v === undefined || entry.l === undefined || entry.c === undefined) {
              allCovered = false;
              break;
            }
          }
          if (allCovered) return;
        }

        onValue(ref(db, 'protocol_stats'), function (snap) {
          try {
            var rawVal = (snap && snap.exists()) ? snap.val() : null;
            var allStats = (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) ? rawVal : {};
            var cacheObj = readFeedMetricsCache();
            for (var idx = 0; idx < activePids.length; idx++) {
              var protocolId = activePids[idx];
              var stats = (Object.prototype.hasOwnProperty.call(allStats, protocolId) && allStats[protocolId] && typeof allStats[protocolId] === 'object' && !Array.isArray(allStats[protocolId]))
                ? allStats[protocolId]
                : null;
              var viewsVal = (stats && stats.views !== undefined) ? sanitizeMetric(stats.views) : 0;
              var likesVal = (stats && stats.likes !== undefined) ? sanitizeMetric(stats.likes) : 0;
              applyFeedMetric(protocolId, 'views', viewsVal);
              applyFeedMetric(protocolId, 'likes', likesVal);
              if (!cacheObj[protocolId] || typeof cacheObj[protocolId] !== 'object' || Array.isArray(cacheObj[protocolId])) {
                cacheObj[protocolId] = {};
              }
              cacheObj[protocolId].v = viewsVal;
              cacheObj[protocolId].l = likesVal;
            }
            cacheObj._ts = Date.now();
            writeFeedMetricsCache(cacheObj);
            refreshFeedSortIfAvailable(['views', 'likes']);
          } catch (e) {}
        }, function () {}, { onlyOnce: true });

        onValue(ref(db, 'protocol_comments'), function (snap) {
          try {
            var rawVal = (snap && snap.exists()) ? snap.val() : null;
            var allComments = (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) ? rawVal : {};
            var cacheObj = readFeedMetricsCache();
            for (var idx = 0; idx < activePids.length; idx++) {
              var protocolId = activePids[idx];
              var commentsMap = Object.prototype.hasOwnProperty.call(allComments, protocolId) ? allComments[protocolId] : null;
              var commentCount = sanitizeMetric(countValidComments(commentsMap));
              applyFeedMetric(protocolId, 'comments', commentCount);
              if (!cacheObj[protocolId] || typeof cacheObj[protocolId] !== 'object' || Array.isArray(cacheObj[protocolId])) {
                cacheObj[protocolId] = {};
              }
              cacheObj[protocolId].c = commentCount;
            }
            cacheObj._ts = Date.now();
            writeFeedMetricsCache(cacheObj);
            refreshFeedSortIfAvailable(['comments']);
          } catch (e) {}
        }, function () {}, { onlyOnce: true });
      }
    `
    : '';

  const protocolPhase2Block = includeProtocol
    ? `
      function initProtocolRemote(db, protocolId, ref, runTransaction, onValue) {
        if (!VALID_PID_RE.test(protocolId)) return;

        var viewsEl = document.getElementById('proto-views-count');
        var likesEl = document.getElementById('proto-likes-count');
        var viewStorageKey = 'ps_view_' + protocolId;
        var likedStorageKey = 'ps_liked_' + protocolId;
        var now = Date.now();
        var cooldown = 24 * 60 * 60 * 1000;

        // Zombie View Lock 자가 치유 방어: NaN, 음수, 미래 시간 검증
        var rawViewTime = safeStorage.getItem(viewStorageKey);
        var lastView = parseInt(rawViewTime || '0', 10);
        if (isNaN(lastView) || lastView <= 0 || lastView > now) {
          lastView = 0;
        }

        var viewsRef = ref(db, 'protocol_stats/' + protocolId + '/views');
        if (now - lastView > cooldown && safeStorage.setItem(viewStorageKey, String(now))) {
          runTransaction(viewsRef, function (curr) {
            return (curr || 0) + 1;
          }).then(function (res) {
            var val = sanitizeMetric((res && res.snapshot && res.snapshot.exists()) ? res.snapshot.val() : 1);
            if (viewsEl) {
              viewsEl.textContent = formatNumber(val);
            }
            patchFeedMetricsCache(protocolId, { v: val });
          }).catch(function () {
            safeStorage.removeItem(viewStorageKey);
          });
        } else {
          onValue(viewsRef, function (snap) {
            var val = sanitizeMetric(snap && snap.exists() ? snap.val() : 0);
            if (viewsEl) {
              viewsEl.textContent = formatNumber(val);
            }
            patchFeedMetricsCache(protocolId, { v: val });
          }, function () {}, { onlyOnce: true });
        }

        // 좋아요 1회 스냅샷 조회 (웹소켓 연결 누수 방지 { onlyOnce: true } + 서버 0일 때 로컬 상태 자가 치유)
        var likesRef = ref(db, 'protocol_stats/' + protocolId + '/likes');
        onValue(likesRef, function (snap) {
          var serverLikes = sanitizeMetric(snap && snap.exists() ? snap.val() : 0);
          if (likesEl) {
            likesEl.textContent = formatNumber(serverLikes);
          }
          patchFeedMetricsCache(protocolId, { l: serverLikes });
          if (serverLikes <= 0 && localState.isLiked && localState.pendingDelta <= 0) {
            localState.isLiked = false;
            safeStorage.removeItem(likedStorageKey);
            if (typeof localState.renderLikeButtonState === 'function') {
              localState.renderLikeButtonState(false);
            }
          }
        }, function () {}, { onlyOnce: true });

        var isSyncing = false;
        localState.syncRemote = function (targetState) {
          if (isSyncing) return;
          isSyncing = true;
          runTransaction(likesRef, function (curr) {
            if (targetState) {
              return (curr || 0) + 1;
            } else {
              if (curr === null || curr === undefined || curr <= 0) {
                return;
              }
              return curr - 1;
            }
          }).then(function (res) {
            if (res && res.committed && res.snapshot && res.snapshot.exists()) {
              var nextLikes = sanitizeMetric(res.snapshot.val());
              if (likesEl) likesEl.textContent = formatNumber(nextLikes);
              patchFeedMetricsCache(protocolId, { l: nextLikes });
            }
          }).catch(function () {
            var reverted = !targetState;
            localState.isLiked = reverted;
            if (reverted) {
              safeStorage.setItem(likedStorageKey, '1');
            } else {
              safeStorage.removeItem(likedStorageKey);
            }
            if (typeof localState.renderLikeButtonState === 'function') {
              localState.renderLikeButtonState(reverted);
            }
          }).finally(function () {
            isSyncing = false;
          });
        };

        if (localState.pendingDelta !== 0) {
          var delta = localState.pendingDelta > 0 ? 1 : -1;
          localState.pendingDelta = 0;
          localState.syncRemote(delta > 0);
        }
      }
    `
    : '';

  const phase2Dispatch =
    mode === 'protocol'
      ? `if (pid) { initProtocolRemote(db, pid, ref, runTransaction, onValue); }`
      : mode === 'feed'
        ? `initFeedRemote(db, ref, onValue);`
        : `
          if (pid) {
            initProtocolRemote(db, pid, ref, runTransaction, onValue);
          } else {
            initFeedRemote(db, ref, onValue);
          }
        `;

  return `
    (function () {
      if (typeof window === 'undefined') return;

      var config = ${configJson};
      var VALID_PID_RE = /^PR-[0-9]{2,4}$/;
      var rawPid = window.__PROTOCOL_ID__;
      var pid = (typeof rawPid === 'string' && VALID_PID_RE.test(rawPid)) ? rawPid : null;

      // ─── 0. Safe Storage & Metric Sanitization Helpers ───
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

      function sanitizeMetric(numVal) {
        var n = Number(numVal);
        return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
      }

      function formatNumber(num) {
        return sanitizeMetric(num).toLocaleString('en-US');
      }

      var FEED_METRICS_CACHE_KEY = 'ps_feed_metrics_v1';
      var FEED_METRICS_TTL_MS = 5 * 60 * 1000;

      function readFeedMetricsCache() {
        var clean = Object.create(null);
        var raw = safeStorage.getItem(FEED_METRICS_CACHE_KEY);
        if (!raw) return clean;
        try {
          var parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return clean;
          if (parsed._ts !== undefined) {
            var tsNum = sanitizeMetric(parsed._ts);
            if (tsNum > 0) clean._ts = tsNum;
          }
          var keys = Object.keys(parsed);
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (!VALID_PID_RE.test(k)) continue;
            var entry = parsed[k];
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
            var safeEntry = {};
            if (entry.v !== undefined && entry.v !== null) safeEntry.v = sanitizeMetric(entry.v);
            if (entry.l !== undefined && entry.l !== null) safeEntry.l = sanitizeMetric(entry.l);
            if (entry.c !== undefined && entry.c !== null) safeEntry.c = sanitizeMetric(entry.c);
            clean[k] = safeEntry;
          }
        } catch (e) {}
        return clean;
      }

      function writeFeedMetricsCache(cacheObj) {
        try {
          safeStorage.setItem(FEED_METRICS_CACHE_KEY, JSON.stringify(cacheObj));
        } catch (e) {}
      }

      function patchFeedMetricsCache(protocolId, patch) {
        if (!VALID_PID_RE.test(protocolId) || !patch || typeof patch !== 'object') return;
        var cacheObj = readFeedMetricsCache();
        if (!cacheObj[protocolId] || typeof cacheObj[protocolId] !== 'object' || Array.isArray(cacheObj[protocolId])) {
          cacheObj[protocolId] = {};
        }
        if (patch.v !== undefined) cacheObj[protocolId].v = sanitizeMetric(patch.v);
        if (patch.l !== undefined) cacheObj[protocolId].l = sanitizeMetric(patch.l);
        if (patch.c !== undefined) cacheObj[protocolId].c = sanitizeMetric(patch.c);
        writeFeedMetricsCache(cacheObj);
      }

      // ─── PHASE 1: Zero-Dependency Local Phase (안전 모드·오프라인에서도 100% 동작) ───
      ${feedPhase1Block}
      ${protocolPhase1Block}
      ${phase1InitCall}

      // ─── PHASE 2: Background Remote Telemetry Phase (지연 로딩 & 장애 격리) ───
      var isConfigValid = Boolean(
        config &&
        !config.disabled &&
        typeof config.apiKey === 'string' &&
        config.apiKey.trim().length > 0 &&
        !/^(your_|placeholder|changeme|dummy)/i.test(config.apiKey.trim()) &&
        typeof config.databaseURL === 'string' &&
        /^https:\\/\\//.test(config.databaseURL.trim())
      );
      if (!isConfigValid) return;

      var remoteStarted = false;
      function startRemoteTelemetry() {
        if (remoteStarted) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          if (typeof window.addEventListener === 'function') {
            window.addEventListener('online', startRemoteTelemetry, { once: true });
          }
          return;
        }
        remoteStarted = true;

        Promise.all([
          import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js')
        ]).then(function (modules) {
          var appMod = modules[0];
          var dbMod = modules[1];
          var app = appMod.getApps && appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(config);
          var db = dbMod.getDatabase(app);
          var ref = dbMod.ref;
          var runTransaction = dbMod.runTransaction;
          var onValue = dbMod.onValue;

          ${phase2Dispatch}

          if (config.measurementId) {
            import('https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js')
              .then(function (analyticsMod) {
                analyticsMod.getAnalytics(app);
              })
              .catch(function () {});
          }
        }).catch(function () {
          // CDN 다운타임, 오프라인 또는 방화벽 차단 시 침묵 (PWA 로컬 경험 완벽 보존)
        });
      }

      var scheduleTelemetry = window.requestIdleCallback || function (cb) { setTimeout(cb, 400); };
      scheduleTelemetry(startRemoteTelemetry);

      ${protocolPhase2Block}
      ${feedPhase2Block}
    })();
  `.trim();
}
