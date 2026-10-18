import { FIREBASE_CONFIG } from '../site.config.ts';

/**
 * [State / Telemetry Layer]
 * Firebase Realtime Database(고빈도 조회수/좋아요 영구 무료 운용) 및 GA4 방문자 분석 런타임 스크립트.
 * Stitch Utilitarian Brutalist 디자인 시스템 및 PWA 오프라인 무결성을 보장하며,
 * 2단계 점진적 향상(Progressive Enhancement) 아키텍처를 채택한다:
 *
 * 1단계 (Zero-Dependency Local Phase): CDN 로드 전 즉시 로컬스토리지 복원, 버튼 이벤트 바인딩, 낙관적 UI 렌더링.
 * 2단계 (Background Remote Telemetry Phase): requestIdleCallback 지연 로드, GA4 격리, { onlyOnce: true } 웹소켓 누수 방지.
 */
export function getFirebaseRuntimeScript(): string {
  const configJson = JSON.stringify(FIREBASE_CONFIG);

  return `
    (function () {
      if (typeof window === 'undefined') return;

      var config = ${configJson};
      if (!config || !config.apiKey || config.disabled || config.apiKey.indexOf('your_') === 0) return;

      var VALID_PID_RE = /^PR-[0-9]{2,4}$/;
      var rawPid = window.__PROTOCOL_ID__;
      var pid = (typeof rawPid === 'string' && VALID_PID_RE.test(rawPid)) ? rawPid : null;

      // ─── 0. Safe Storage Helper (Safari Private Mode / SecurityError / QuotaExceededError 방어) ───
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

      function formatNumber(num) {
        return (Number(num) || 0).toLocaleString();
      }

      function getToastMessage(isLiked) {
        var lang = document.documentElement.getAttribute('lang') || 'ko';
        var strings = (window.__UI_STRINGS__ && window.__UI_STRINGS__[lang]) || (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};
        if (isLiked) {
          return strings.toastLiked || '생존 기술 유용성을 확인했습니다.';
        } else {
          return strings.toastUnliked || '생존 확인이 취소되었습니다.';
        }
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

      // ─── PHASE 1: Zero-Dependency Local Phase (동기 실행 / PWA 오프라인 100% 보장) ───
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

      if (pid) {
        initLocalProtocolUI(pid);
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

        // 초기 로컬 상태 즉시 렌더링
        renderLikeButtonState(localState.isLiked);

        // 클릭 리스너 즉각 동기 등록 (네트워크/CDN 로드 실패 시에도 로컬 토글 100% 동작 + 매크로 어뷰징 방어)
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

            // 낙관적 카운터 UI 반영
            if (likesEl) {
              var currentNum = parseInt((likesEl.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
              var nextNum = targetState ? currentNum + 1 : Math.max(0, currentNum - 1);
              likesEl.textContent = formatNumber(nextNum);
            }

            // 다국어 토스트 메시지 즉시 출력
            showToast(getToastMessage(targetState));

            // 원격 동기화 트리거
            if (typeof localState.syncRemote === 'function') {
              localState.syncRemote(targetState);
            } else {
              localState.pendingDelta += (targetState ? 1 : -1);
            }
          });
        }
      }

      // ─── PHASE 2: Background Remote Telemetry Phase (지연 로딩 & 장애 격리) ───
      var scheduleTelemetry = window.requestIdleCallback || function (cb) { setTimeout(cb, 400); };

      scheduleTelemetry(function () {
        // A. Firebase Realtime Database 코어 우선 비동기 동기화 (GA4 애드블록 차단과 완벽 분리)
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

          if (pid) {
            initProtocolRemote(db, pid, ref, runTransaction, onValue);
          } else {
            initFeedRemote(db, ref, onValue);
          }

          // B. GA4 격리 로드 (애드블록 등으로 차단되어도 DB 로직에 영향 제로)
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
      });

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
            if (viewsEl) {
              var val = (res && res.snapshot && res.snapshot.exists()) ? res.snapshot.val() : 1;
              viewsEl.textContent = formatNumber(val);
            }
          }).catch(function () {
            safeStorage.removeItem(viewStorageKey);
          });
        } else {
          onValue(viewsRef, function (snap) {
            if (viewsEl) {
              viewsEl.textContent = snap.exists() ? formatNumber(snap.val()) : '0';
            }
          }, { onlyOnce: true });
        }

        // B. 좋아요 1회 스냅샷 조회 (웹소켓 연결 누수 방지 { onlyOnce: true } + 서버 0일 때 로컬 상태 자가 치유)
        var likesRef = ref(db, 'protocol_stats/' + protocolId + '/likes');
        onValue(likesRef, function (snap) {
          var serverLikes = snap.exists() ? (Number(snap.val()) || 0) : 0;
          if (likesEl) {
            likesEl.textContent = formatNumber(serverLikes);
          }
          if (serverLikes <= 0 && localState.isLiked && localState.pendingDelta <= 0) {
            localState.isLiked = false;
            safeStorage.removeItem(likedStorageKey);
            if (typeof localState.renderLikeButtonState === 'function') {
              localState.renderLikeButtonState(false);
            }
          }
        }, { onlyOnce: true });

        // 원격 동기화 핸들러 등록 (보안 규칙 !data.exists() || +1 || (data > 0 && -1) 100% 준수)
        var isSyncing = false;
        localState.syncRemote = function (targetState) {
          if (isSyncing) return;
          isSyncing = true;
          runTransaction(likesRef, function (curr) {
            if (targetState) {
              return (curr || 0) + 1;
            } else {
              if (curr === null || curr === undefined || curr <= 0) {
                return; // 이미 0이거나 노드가 없으면 트랜잭션 중단(불필요한 Permission Denied 방지)
              }
              return curr - 1;
            }
          }).then(function (res) {
            if (res && res.committed && res.snapshot && res.snapshot.exists() && likesEl) {
              likesEl.textContent = formatNumber(res.snapshot.val());
            }
          }).catch(function () {
            // 트랜잭션 거부/오류 시 로컬 상태 롤백
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

        // 로컬에서 CDN 로딩 전에 누른 클릭이 있다면 원격으로 전파 (보안 규칙 준수를 위해 ±1 단위로 전파)
        if (localState.pendingDelta !== 0) {
          var delta = localState.pendingDelta > 0 ? 1 : -1;
          localState.pendingDelta = 0;
          localState.syncRemote(delta > 0);
        }
      }

      function initFeedRemote(db, ref, onValue) {
        // 보안 규칙($protocolId: { ".read": true })과 100% 호환되도록 화면 내 유효 프로토콜 카드별 개별 1회 조회
        var viewEls = document.querySelectorAll('[data-feed-views]');
        var queriedMap = {};

        for (var i = 0; i < viewEls.length; i++) {
          var protocolId = viewEls[i].getAttribute('data-feed-views');
          if (!protocolId || !VALID_PID_RE.test(protocolId) || queriedMap[protocolId]) continue;
          queriedMap[protocolId] = true;

          (function (pidKey) {
            var itemRef = ref(db, 'protocol_stats/' + pidKey);
            onValue(itemRef, function (snap) {
              var stats = (snap && snap.exists() && typeof snap.val() === 'object') ? snap.val() : null;
              var cardViewEl = document.querySelector('[data-feed-views="' + pidKey + '"]');
              var cardLikeEl = document.querySelector('[data-feed-likes="' + pidKey + '"]');
              if (cardViewEl) {
                cardViewEl.textContent = (stats && stats.views !== undefined) ? formatNumber(stats.views) : '0';
              }
              if (cardLikeEl) {
                cardLikeEl.textContent = (stats && stats.likes !== undefined) ? formatNumber(stats.likes) : '0';
              }
            }, { onlyOnce: true });
          })(protocolId);
        }
      }
    })();
  `.trim();
}
