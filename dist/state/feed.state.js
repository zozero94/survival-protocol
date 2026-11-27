import { CLIENT_LOCALE_DETECTOR_BODY } from '../i18n/locales.js';
import { UI_STRINGS } from '../i18n/ui-strings.js';
import { FEED_SORT_OPTIONS } from '../types/protocol.types.js';

/**
 * [State / ViewModel Layer]
 * 인덱스 피드 페이지의 5개 단위 페이징, 7대 카테고리 필터링, 5종 전술 정렬 및
 * 7개국어 0.01초 무새로고침 핫스왑을 제어하는 클라이언트 런타임 스크립트
 */
export function getFeedRuntimeScript()         {
  const validSortsJson = JSON.stringify(FEED_SORT_OPTIONS.map((opt) => opt.id));
  const metricSortAttrsJson = JSON.stringify(
    Object.fromEntries(
      FEED_SORT_OPTIONS.filter((opt) => opt.isMetric).map((opt) => [opt.id, `data-${opt.id}`])
    )
  );
  const sortFallbackLabelsJson = JSON.stringify(
    Object.fromEntries(FEED_SORT_OPTIONS.map((opt) => [opt.id, UI_STRINGS.ko[opt.i18nKey]]))
  );

  return `
    window.__UI_STRINGS__ = ${JSON.stringify(UI_STRINGS)};

    (function () {
      var PAGE_SIZE = 5;
      var currentPage = 1;
      var currentCategory = 'ALL';
      var currentSort = 'latest';
      var currentLang = 'ko';
      var isSortMenuOpen = false;
      var lastRenderedOrderKey = '';

      var allCards = Array.from(document.querySelectorAll('[data-protocol-card]'));
      var feedContainer = document.getElementById('protocol-feed-container');
      var paginationNav = document.getElementById('pagination-nav');
      var rangeLabel = document.getElementById('pagination-range-label');
      var totalItemsLabel = document.getElementById('pagination-total-items-label');
      var pagesContainer = document.getElementById('pagination-pages-container');
      var prevBtn = document.getElementById('pagination-prev-btn');
      var nextBtn = document.getElementById('pagination-next-btn');

      var sortMenuEl = document.getElementById('sort-dropdown-menu');
      var sortToggleBtn = document.getElementById('sort-toggle-btn');
      var sortToggleLabel = document.getElementById('sort-toggle-label');
      var sortToggleArrow = document.getElementById('sort-toggle-arrow');
      var sortOptionBtns = Array.from(document.querySelectorAll('[data-action="select-sort"]'));

      var VALID_SORTS = ${validSortsJson};
      var METRIC_SORT_ATTRS = ${metricSortAttrsJson};
      var SORT_FALLBACK_LABELS = ${sortFallbackLabelsJson};

      // 카드별 불변 정적 메타데이터(작성일 타임스탬프, 프로토콜 번호)를 초기화 시 1회 파싱
      function parseCardTimestamp(dateStr) {
        if (!dateStr) return 0;
        var parsed = Date.parse(dateStr);
        return isNaN(parsed) ? 0 : parsed;
      }

      function parseCardNumber(pidStr) {
        var digits = String(pidStr || '').replace(/[^0-9]/g, '');
        var parsed = parseInt(digits || '0', 10);
        return isNaN(parsed) ? 0 : parsed;
      }

      var cardMetaList = allCards.map(function (card) {
        return {
          el: card,
          pid: card.getAttribute('data-protocol-card') || '',
          category: card.getAttribute('data-category') || '',
          time: parseCardTimestamp(card.getAttribute('data-created-at') || ''),
          num: parseCardNumber(card.getAttribute('data-protocol-card') || '')
        };
      });

      function getNumericAttr(card, attrName) {
        var raw = card.getAttribute(attrName);
        if (!raw) return 0;
        var n = Number(raw);
        return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
      }

      function compareByLatest(timeA, timeB, numA, numB) {
        if (timeB !== timeA) return timeB - timeA;
        return numB - numA;
      }

      function sortCardMeta(metaList, sortMode) {
        var metricAttr = METRIC_SORT_ATTRS[sortMode];
        if (metricAttr) {
          for (var i = 0; i < metaList.length; i++) {
            metaList[i].metric = getNumericAttr(metaList[i].el, metricAttr);
          }
        }
        return metaList.slice().sort(function (a, b) {
          if (metricAttr) {
            var metricDiff = b.metric - a.metric;
            if (metricDiff !== 0) return metricDiff;
            return compareByLatest(a.time, b.time, a.num, b.num);
          }
          if (sortMode === 'oldest') {
            return compareByLatest(b.time, a.time, b.num, a.num);
          }
          return compareByLatest(a.time, b.time, a.num, b.num);
        });
      }

      function setSortMenuOpen(isOpen, shouldFocusTrigger) {
        if (!sortMenuEl || !sortToggleBtn) return;
        if (isSortMenuOpen === isOpen) return;
        isSortMenuOpen = isOpen;
        if (isOpen) {
          sortMenuEl.classList.remove('hidden');
          sortToggleBtn.setAttribute('aria-expanded', 'true');
          if (sortToggleArrow) sortToggleArrow.textContent = '▲';
          var selectedOpt = null;
          for (var i = 0; i < sortOptionBtns.length; i++) {
            if (sortOptionBtns[i].getAttribute('data-sort-value') === currentSort) {
              selectedOpt = sortOptionBtns[i];
              break;
            }
          }
          if (!selectedOpt && sortOptionBtns.length > 0) selectedOpt = sortOptionBtns[0];
          if (selectedOpt && typeof selectedOpt.focus === 'function') {
            selectedOpt.focus();
          }
        } else {
          sortMenuEl.classList.add('hidden');
          sortToggleBtn.setAttribute('aria-expanded', 'false');
          if (sortToggleArrow) sortToggleArrow.textContent = '▼';
          if (shouldFocusTrigger && typeof sortToggleBtn.focus === 'function') {
            sortToggleBtn.focus();
          }
        }
      }

      function applySortUI(sortMode) {
        var uiStrings = (window.__UI_STRINGS__ && window.__UI_STRINGS__[currentLang]) || (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};
        var i18nKey = 'sort_' + sortMode;

        if (sortToggleBtn) {
          sortToggleBtn.setAttribute('data-sort', sortMode);
        }
        if (sortToggleLabel) {
          sortToggleLabel.setAttribute('data-i18n', i18nKey);
          sortToggleLabel.textContent = uiStrings[i18nKey] || SORT_FALLBACK_LABELS[sortMode] || '최신순';
        }

        sortOptionBtns.forEach(function (optionEl) {
          var sortValue = optionEl.getAttribute('data-sort-value');
          var isSelected = sortValue === sortMode;
          optionEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          optionEl.className = 'flex items-center justify-between gap-3 whitespace-nowrap px-3 py-3 sm:py-2 min-h-[44px] sm:min-h-0 border-b last:border-b-0 cursor-pointer text-left transition-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#fde68a] ' +
            (isSelected
              ? 'bg-[#2a2a2a] text-white font-bold border-[#303030]'
              : 'text-neutral-400 hover:bg-[#1f1f1f] hover:text-white border-[#252525]');

          var checkEl = optionEl.querySelector('[data-sort-check]');
          if (checkEl) {
            checkEl.classList.toggle('invisible', !isSelected);
          }
          var badgeEl = optionEl.querySelector('[data-sort-badge]');
          if (badgeEl) {
            badgeEl.className = 'text-[10px] ' + (isSelected ? 'text-neutral-300' : 'text-neutral-400');
          }
        });
      }

      function syncFeedUrl() {
        try {
          if (!window.history || typeof window.history.replaceState !== 'function') return;
          var params = new URLSearchParams(window.location.search);
          if (currentCategory && currentCategory !== 'ALL') {
            params.set('cat', currentCategory);
          } else {
            params.delete('cat');
          }
          if (currentSort && currentSort !== 'latest') {
            params.set('sort', currentSort);
          } else {
            params.delete('sort');
          }
          if (currentPage > 1) {
            params.set('page', String(currentPage));
          } else {
            params.delete('page');
          }
          var qs = params.toString();
          var nextUrl = (window.location.pathname || '/') + (qs ? '?' + qs : '') + (window.location.hash || '');
          window.history.replaceState(null, '', nextUrl);
        } catch (e) {}
      }

      function detectInitialFeedLocale() {
        ${CLIENT_LOCALE_DETECTOR_BODY}
        return (lang && window.__UI_STRINGS__[lang]) ? lang : 'ko';
      }

      function renderHighlightTermsClient(text) {
        if (!text) return '';
        var withLinks = text.replace(/\\\[([^\\\]]+)\\\]\\(([^)]+)\\)/g, function(_m, label, url) {
          return '<a data-proto="crosslink" href="' + url + '" onclick="event.stopPropagation();" class="inline-flex items-center gap-0.5 text-[#fde68a] font-mono font-bold underline decoration-[#fde68a]/60 underline-offset-4 bg-[#221f14] hover:bg-[#fde68a] hover:text-black px-1.5 py-0.5 border border-[#4a3b1a] transition-colors">' + label + ' ↗</a>';
        });
        return withLinks.replace(/\\*\\*(.*?)\\*\\*/g, function(_m, p1) {
          var isMetric = /\\d+|cm|mm|kg|℃|도|분|초|방울|리터|L|ml|컵/i.test(p1);
          if (isMetric) {
            return '<strong data-proto="highlight" class="text-[#fde68a] font-mono font-bold bg-[#221f14] px-1 py-0.5 border border-[#4a3b1a] select-text">' + p1 + '</strong>';
          }
          return '<strong data-proto="highlight" class="text-white font-bold bg-[#262626] px-1 py-0.5 border border-[#383838] select-text">' + p1 + '</strong>';
        });
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

          // 1. UI 정적 문자열 전수 핫스왑 (헤더, 선언문, 카테고리 탭, 위험 배지, 열람 버튼, 페이징, 푸터, 오프라인 배너, 지표 라벨)
          document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (ui[key] !== undefined) {
              el.textContent = ui[key];
            }
          });
          document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (ui[key] !== undefined) {
              el.placeholder = ui[key];
            }
          });

          // 2. 프로토콜 피드 카드별 다국어 제목, 요약, 준비물 칩 핫스왑
          var feedMap = (window.__FEED_PROTOCOLS__ && window.__FEED_PROTOCOLS__[targetLocale]) || {};
          document.querySelectorAll('[data-card-title]').forEach(function (el) {
            var pid = el.getAttribute('data-card-title');
            if (feedMap[pid] && feedMap[pid].title) {
              el.textContent = feedMap[pid].title;
            }
          });
          document.querySelectorAll('[data-card-summary]').forEach(function (el) {
            var pid = el.getAttribute('data-card-summary');
            if (feedMap[pid] && feedMap[pid].summary) {
              el.innerHTML = renderHighlightTermsClient(feedMap[pid].summary);
            }
          });
          document.querySelectorAll('[data-card-mat]').forEach(function (el) {
            var pid = el.getAttribute('data-card-mat');
            var mIdx = parseInt(el.getAttribute('data-mat-idx'), 10);
            if (feedMap[pid] && Array.isArray(feedMap[pid].materials) && feedMap[pid].materials[mIdx]) {
              el.textContent = '[' + feedMap[pid].materials[mIdx] + ']';
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

      function getFilteredCardMeta() {
        var filtered = cardMetaList;
        if (currentCategory !== 'ALL') {
          filtered = cardMetaList.filter(function (meta) {
            return meta.category === currentCategory;
          });
        }
        return sortCardMeta(filtered, currentSort);
      }

      function updateFeed() {
        var filtered = getFilteredCardMeta();
        var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var startIndex = (currentPage - 1) * PAGE_SIZE;
        var endIndex = startIndex + PAGE_SIZE;
        var pageMeta = filtered.slice(startIndex, endIndex);
        var pageIds = pageMeta.map(function (m) { return m.pid; }).join(',');
        var renderKey = currentCategory + '|' + currentSort + '|' + currentPage + '|' + filtered.length + '|' + pageIds;

        if (renderKey === lastRenderedOrderKey) return;
        lastRenderedOrderKey = renderKey;

        // 전체 카드 숨김 후 현재 페이지 범위만 표시 및 DOM 재배치
        allCards.forEach(function (card) { card.style.display = 'none'; });
        pageMeta.forEach(function (meta) {
          meta.el.style.display = '';
          if (feedContainer) {
            feedContainer.appendChild(meta.el);
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
        var rawTarget = e.target;
        var target = (rawTarget && rawTarget.nodeType === 3) ? rawTarget.parentElement : rawTarget;
        if (!target || typeof target.closest !== 'function') return;

        var wasSortMenuOpen = isSortMenuOpen;
        var clickedInsideSort = Boolean(target.closest('#sort-control-wrapper'));
        if (wasSortMenuOpen && !clickedInsideSort) {
          setSortMenuOpen(false, false);
        }

        var pageBtn = target.closest('[data-action="goto-page"]');
        if (pageBtn && !pageBtn.disabled) {
          var targetPage = parseInt(pageBtn.getAttribute('data-page-target'), 10);
          if (!isNaN(targetPage) && targetPage !== currentPage) {
            currentPage = targetPage;
            syncFeedUrl();
            updateFeed();
            if (typeof window.scrollTo === 'function') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
          return;
        }

        var catBtn = target.closest('[data-action="filter-category"]');
        if (catBtn) {
          var newCat = catBtn.getAttribute('data-category');
          if (newCat && newCat !== currentCategory) {
            currentCategory = newCat;
            currentPage = 1;

            document.querySelectorAll('[data-action="filter-category"]').forEach(function (btn) {
              var isSel = btn.getAttribute('data-category') === currentCategory;
              if (isSel) {
                btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-white text-black font-bold transition-none';
              } else {
                btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-none';
              }
            });

            syncFeedUrl();
            updateFeed();
          }
          return;
        }

        var sortOptionBtn = target.closest('[data-action="select-sort"]');
        if (sortOptionBtn) {
          var nextSort = sortOptionBtn.getAttribute('data-sort-value');
          if (nextSort && VALID_SORTS.indexOf(nextSort) !== -1) {
            if (nextSort === currentSort) {
              setSortMenuOpen(false, true);
              return;
            }
            currentSort = nextSort;
            applySortUI(currentSort);
            setSortMenuOpen(false, true);
            currentPage = 1;
            syncFeedUrl();
            updateFeed();
          }
          return;
        }

        var sortBtn = target.closest('[data-action="toggle-sort"]');
        if (sortBtn) {
          setSortMenuOpen(!isSortMenuOpen, false);
          return;
        }

        // 드롭다운을 방금 닫은 외부 클릭이 카드 영역 위였다면 오클릭 상세 이동을 차단
        if (wasSortMenuOpen && !clickedInsideSort) {
          return;
        }

        // 크로스링크 클릭 시 해당 링크로 직접 이동 (현재 언어 유지)
        var crosslink = target.closest('a[data-proto="crosslink"]');
        if (crosslink) {
          var crossHref = crosslink.getAttribute('href');
          if (crossHref) {
            var targetCrossUrl = (currentLang && currentLang !== 'ko') ? (crossHref.split('?')[0] + '?lang=' + currentLang) : crossHref;
            window.location.href = targetCrossUrl;
            return;
          }
        }

        // 피드 카드 어디를 클릭/터치해도 상세페이지로 즉시 랜딩 (텍스트 드래그 선택 및 새 탭 단축키 존중)
        var card = target.closest('[data-protocol-href]');
        if (card && !target.closest('button') && !target.closest('a')) {
          var selText = (window.getSelection && window.getSelection().toString()) || '';
          if (selText) return;
          var href = card.getAttribute('data-protocol-href');
          if (href) {
            var targetUrl = (currentLang && currentLang !== 'ko') ? (href + '?lang=' + currentLang) : href;
            if (e.metaKey || e.ctrlKey) {
              window.open(targetUrl, '_blank', 'noopener');
            } else {
              window.location.href = targetUrl;
            }
            return;
          }
        }
      });

      document.addEventListener('keydown', function (e) {
        var key = e.key;
        // 검색 모달 단축키 진입 시 열린 정렬 드롭다운 자동 닫기
        if ((e.metaKey || e.ctrlKey) && key && key.toLowerCase() === 'k') {
          if (isSortMenuOpen) setSortMenuOpen(false, false);
          return;
        }
        var activeEl = document.activeElement;
        var activeTag = activeEl && activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
        if (key === '/' && activeTag !== 'input' && activeTag !== 'textarea') {
          if (isSortMenuOpen) setSortMenuOpen(false, false);
          return;
        }

        if (isSortMenuOpen) {
          if (key === 'Escape') {
            e.preventDefault();
            setSortMenuOpen(false, true);
            return;
          }
          if (key === 'Tab') {
            setSortMenuOpen(false, false);
            return;
          }
          if (sortOptionBtns.length > 0 && (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End')) {
            e.preventDefault();
            var curIdx = sortOptionBtns.indexOf(activeEl);
            var nextIdx = 0;
            if (key === 'Home') {
              nextIdx = 0;
            } else if (key === 'End') {
              nextIdx = sortOptionBtns.length - 1;
            } else if (key === 'ArrowDown') {
              nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % sortOptionBtns.length;
            } else if (key === 'ArrowUp') {
              nextIdx = curIdx === -1 ? sortOptionBtns.length - 1 : (curIdx - 1 + sortOptionBtns.length) % sortOptionBtns.length;
            }
            if (sortOptionBtns[nextIdx] && typeof sortOptionBtns[nextIdx].focus === 'function') {
              sortOptionBtns[nextIdx].focus();
            }
          }
          return;
        }

        if (key === 'ArrowDown' && sortToggleBtn && activeEl === sortToggleBtn) {
          e.preventDefault();
          setSortMenuOpen(true, false);
        }
      });

      if (typeof window.addEventListener === 'function') {
        window.addEventListener('scroll', function () {
          if (isSortMenuOpen) setSortMenuOpen(false, false);
        }, { passive: true });
      }

      window.__refreshFeedSort__ = function (changedFields) {
        if (!METRIC_SORT_ATTRS[currentSort]) return;
        if (Array.isArray(changedFields) && changedFields.indexOf(currentSort) === -1) return;
        updateFeed();
      };

      // 초기 실행 (URL ?cat=, ?sort=, ?page= 파라미터 지원)
      try {
        var urlParams = new URLSearchParams(window.location.search);
        var catParam = urlParams.get('cat');
        var validCategories = ['ALL', 'FOOD', 'SHELTER', 'TOOLS', 'MATERIALS', 'MEDICINE'];
        if (catParam && validCategories.indexOf(catParam) !== -1) {
          currentCategory = catParam;
          document.querySelectorAll('[data-action="filter-category"]').forEach(function (btn) {
            var isSel = btn.getAttribute('data-category') === currentCategory;
            if (isSel) {
              btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-white text-black font-bold transition-none';
            } else {
              btn.className = 'px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition-none';
            }
          });
        }
        var sortParam = urlParams.get('sort');
        if (sortParam && VALID_SORTS.indexOf(sortParam) !== -1) {
          currentSort = sortParam;
        }
        var pageParam = parseInt(urlParams.get('page') || '', 10);
        if (!isNaN(pageParam) && pageParam > 0) {
          currentPage = pageParam;
        }
      } catch (e) {}
      applySortUI(currentSort);
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
