import { CLIENT_LOCALE_DETECTOR_BODY } from '../i18n/locales.js';
import { UI_STRINGS } from '../i18n/ui-strings.js';

/**
 * [State / ViewModel Layer]
 * 인덱스 피드 페이지의 5개 단위 페이징, 7대 카테고리 필터링 및 7개국어 0.01초 무새로고침 핫스왑을 제어하는 클라이언트 런타임 스크립트
 */
export function getFeedRuntimeScript()         {
  return `
    window.__UI_STRINGS__ = ${JSON.stringify(UI_STRINGS)};

    (function () {
      var PAGE_SIZE = 5;
      var currentPage = 1;
      var currentCategory = 'ALL';
      var currentSort = 'latest';
      var currentLang = 'ko';

      var allCards = Array.from(document.querySelectorAll('[data-protocol-card]'));
      var feedContainer = document.getElementById('protocol-feed-container');
      var paginationNav = document.getElementById('pagination-nav');
      var rangeLabel = document.getElementById('pagination-range-label');
      var totalItemsLabel = document.getElementById('pagination-total-items-label');
      var pagesContainer = document.getElementById('pagination-pages-container');

      function sortCards(cards, sortMode) {
        return cards.slice().sort(function (a, b) {
          var dateA = a.getAttribute('data-created-at') || '';
          var dateB = b.getAttribute('data-created-at') || '';
          var timeA = dateA ? new Date(dateA).getTime() : 0;
          var timeB = dateB ? new Date(dateB).getTime() : 0;
          var numA = parseInt((a.getAttribute('data-protocol-card') || '').replace(/\D/g, '') || '0', 10);
          var numB = parseInt((b.getAttribute('data-protocol-card') || '').replace(/\D/g, '') || '0', 10);

          if (sortMode === 'latest') {
            if (timeB !== timeA) return timeB - timeA;
            return numB - numA;
          } else {
            if (timeA !== timeB) return timeA - timeB;
            return numA - numB;
          }
        });
      }

      function detectInitialFeedLocale() {
        ${CLIENT_LOCALE_DETECTOR_BODY}
        return (lang && window.__UI_STRINGS__[lang]) ? lang : 'ko';
      }

      function switchFeedLocale(targetLocale) {
        try {
          var ui = window.__UI_STRINGS__[targetLocale];
          if (!ui) return;
          currentLang = targetLocale;
          document.documentElement.lang = targetLocale;

          if (ui.feedHeaderTitle) {
            document.title = ui.feedHeaderTitle;
          }

          // 1. UI 정적 문자열 전수 핫스왑 (헤더, 선언문, 카테고리 탭, 위험 배지, 열람 버튼, 페이징, 푸터, 오프라인 배너)
          document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (ui[key] !== undefined) {
              el.innerText = ui[key];
            }
          });

          // 2. 프로토콜 피드 카드별 다국어 제목, 요약, 준비물 칩 핫스왑
          var feedMap = (window.__FEED_PROTOCOLS__ && window.__FEED_PROTOCOLS__[targetLocale]) || {};
          document.querySelectorAll('[data-card-title]').forEach(function (el) {
            var pid = el.getAttribute('data-card-title');
            if (feedMap[pid] && feedMap[pid].title) {
              el.innerText = feedMap[pid].title;
            }
          });
          document.querySelectorAll('[data-card-summary]').forEach(function (el) {
            var pid = el.getAttribute('data-card-summary');
            if (feedMap[pid] && feedMap[pid].summary) {
              el.innerText = feedMap[pid].summary;
            }
          });
          document.querySelectorAll('[data-card-mat]').forEach(function (el) {
            var pid = el.getAttribute('data-card-mat');
            var mIdx = parseInt(el.getAttribute('data-mat-idx'), 10);
            if (feedMap[pid] && Array.isArray(feedMap[pid].materials) && feedMap[pid].materials[mIdx]) {
              el.innerText = '[' + feedMap[pid].materials[mIdx] + ']';
            }
          });
          document.querySelectorAll('a[href^="/protocol-"]').forEach(function (link) {
            var baseHref = link.getAttribute('href').split('?')[0];
            link.setAttribute('href', targetLocale === 'ko' ? baseHref : (baseHref + '?lang=' + targetLocale));
          });
        } catch (err) {
          console.error('[Feed i18n] Switch error:', err);
        } finally {
          document.documentElement.removeAttribute('data-fouc');
        }
      }

      function getFilteredCards() {
        var filtered = allCards;
        if (currentCategory !== 'ALL') {
          filtered = allCards.filter(function (card) {
            return card.getAttribute('data-category') === currentCategory;
          });
        }
        return sortCards(filtered, currentSort);
      }

      function updateFeed() {
        var filtered = getFilteredCards();
        var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var startIndex = (currentPage - 1) * PAGE_SIZE;
        var endIndex = startIndex + PAGE_SIZE;

        // 전체 카드 숨김 후 현재 페이지 범위만 표시 및 DOM 재배치
        allCards.forEach(function (card) { card.style.display = 'none'; });
        var pageCards = filtered.slice(startIndex, endIndex);
        pageCards.forEach(function (card) {
          card.style.display = '';
          if (feedContainer) {
            feedContainer.appendChild(card);
          }
        });

        // 범위 레이블 업데이트
        if (rangeLabel) {
          var displayStart = filtered.length > 0 ? startIndex + 1 : 0;
          var displayEnd = Math.min(endIndex, filtered.length);
          rangeLabel.textContent = displayStart + ' - ' + displayEnd;
        }
        if (totalItemsLabel) {
          totalItemsLabel.textContent = filtered.length;
        }

        // 페이지 네비게이션 가시성
        if (paginationNav) {
          paginationNav.style.display = filtered.length === 0 ? 'none' : '';
        }

        // 페이지 번호 버튼 재생성 ([01], [02], ...)
        if (pagesContainer) {
          pagesContainer.innerHTML = '';
          for (var i = 1; i <= totalPages; i++) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-action', 'goto-page');
            btn.setAttribute('data-page-target', i);
            var padNum = (i < 10 ? '0' : '') + i;
            btn.className = 'px-3 py-1.5 font-mono text-xs transition-none ' +
              (i === currentPage
                ? 'bg-white text-black font-bold border border-white'
                : 'bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800');
            btn.textContent = padNum;
            pagesContainer.appendChild(btn);
          }
        }

        // 이전/다음 버튼 상태 및 대상 페이지 동적 업데이트 (2페이지 진입 시 좌측 화살표 정상 활성화)
        var prevBtn = document.getElementById('pagination-prev-btn');
        var nextBtn = document.getElementById('pagination-next-btn');

        if (prevBtn) {
          var prevTarget = currentPage - 1;
          prevBtn.setAttribute('data-page-target', prevTarget);
          if (currentPage <= 1) {
            prevBtn.setAttribute('disabled', 'true');
            prevBtn.className = 'px-3 py-1.5 font-mono text-xs transition-none bg-black text-neutral-700 border border-neutral-900 cursor-not-allowed';
          } else {
            prevBtn.removeAttribute('disabled');
            prevBtn.className = 'px-3 py-1.5 font-mono text-xs transition-none bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800';
          }
        }

        if (nextBtn) {
          var nextTarget = currentPage + 1;
          nextBtn.setAttribute('data-page-target', nextTarget);
          if (currentPage >= totalPages) {
            nextBtn.setAttribute('disabled', 'true');
            nextBtn.className = 'px-3 py-1.5 font-mono text-xs transition-none bg-black text-neutral-700 border border-neutral-900 cursor-not-allowed';
          } else {
            nextBtn.removeAttribute('disabled');
            nextBtn.className = 'px-3 py-1.5 font-mono text-xs transition-none bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800';
          }
        }
      }

      // 이벤트 위임 처리
      document.addEventListener('click', function (e) {
        var pageBtn = e.target.closest('[data-action="goto-page"]');
        if (pageBtn && !pageBtn.disabled) {
          var targetPage = parseInt(pageBtn.getAttribute('data-page-target'), 10);
          if (!isNaN(targetPage) && targetPage !== currentPage) {
            currentPage = targetPage;
            updateFeed();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        }

        var catBtn = e.target.closest('[data-action="filter-category"]');
        if (catBtn) {
          var newCat = catBtn.getAttribute('data-category');
          if (newCat && newCat !== currentCategory) {
            currentCategory = newCat;
            currentPage = 1;

            // 7개 칩 스타일 동기화
            document.querySelectorAll('[data-action="filter-category"]').forEach(function (btn) {
              var isSel = btn.getAttribute('data-category') === currentCategory;
              if (isSel) {
                btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-white text-black font-bold transition-none';
              } else {
                btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-none';
              }
            });

            updateFeed();
          }
          return;
        }

        var sortBtn = e.target.closest('[data-action="toggle-sort"]');
        if (sortBtn) {
          currentSort = currentSort === 'latest' ? 'oldest' : 'latest';
          sortBtn.setAttribute('data-sort', currentSort);

          var sortLabel = document.getElementById('sort-toggle-label');
          var sortArrow = document.getElementById('sort-toggle-arrow');
          var uiStrings = (window.__UI_STRINGS__ && window.__UI_STRINGS__[currentLang]) || (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};

          if (sortLabel) {
            var i18nKey = currentSort === 'latest' ? 'sort_latest' : 'sort_oldest';
            sortLabel.setAttribute('data-i18n', i18nKey);
            sortLabel.innerText = uiStrings[i18nKey] || (currentSort === 'latest' ? '최신순' : '오래된순');
          }
          if (sortArrow) {
            sortArrow.innerText = currentSort === 'latest' ? '▼' : '▲';
          }

          currentPage = 1;
          updateFeed();
          return;
        }

        // 피드 카드 어디를 클릭/터치해도 상세페이지로 즉시 랜딩 (현재 언어 유지)
        var card = e.target.closest('[data-protocol-href]');
        if (card && !e.target.closest('button')) {
          var href = card.getAttribute('data-protocol-href');
          if (href) {
            var targetUrl = (currentLang && currentLang !== 'ko') ? (href + '?lang=' + currentLang) : href;
            window.location.href = targetUrl;
            return;
          }
        }
      });

      // 초기 실행
      updateFeed();
      var initLang = detectInitialFeedLocale();
      if (initLang && initLang !== 'ko') {
        switchFeedLocale(initLang);
      } else {
        document.documentElement.removeAttribute('data-fouc');
      }
      setTimeout(function () {
        document.documentElement.removeAttribute('data-fouc');
      }, 150);
    })();
  `.trim();
}
