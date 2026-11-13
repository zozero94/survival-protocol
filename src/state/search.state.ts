import type { SupportedLocale } from '../i18n/locales.ts';
import type { SearchDocument } from '../services/search.service.ts';

/**
 * [State / ViewModel Layer]
 * 클라이언트 런타임 인메모리 검색 엔진 스크립트
 * Fuse.js 기반 0ms 고속 탐색, 한국어 초성 검색(ㅅㅅ -> 식수),
 * 키보드 단축키(Cmd+K, /, ESC, 방향키, Enter), Stitch 다크 모달 UI 제어
 */
export function getSearchRuntimeScript(
  searchDocsByLocale?: Partial<Record<SupportedLocale, SearchDocument[]>>
): string {
  const inlineDocsInit = searchDocsByLocale
    ? `window.__SEARCH_DOCS__ = window.__SEARCH_DOCS__ || ${JSON.stringify(searchDocsByLocale)};`
    : '';

  return `
  (function () {
    ${inlineDocsInit}

    var CONJOINING_TO_COMPAT = {
      0x1100: 'ㄱ', 0x1101: 'ㄲ', 0x1102: 'ㄴ', 0x1103: 'ㄷ', 0x1104: 'ㄸ',
      0x1105: 'ㄹ', 0x1106: 'ㅁ', 0x1107: 'ㅂ', 0x1108: 'ㅃ', 0x1109: 'ㅅ',
      0x110a: 'ㅆ', 0x110b: 'ㅇ', 0x110c: 'ㅈ', 0x110d: 'ㅉ', 0x110e: 'ㅊ',
      0x110f: 'ㅋ', 0x1110: 'ㅌ', 0x1111: 'ㅍ', 0x1112: 'ㅎ'
    };

    function normalizeHangulQueryClient(query) {
      if (!query) return '';
      var nfc = query.normalize ? query.normalize('NFC') : query;
      var res = '';
      for (var i = 0; i < nfc.length; i++) {
        var code = nfc.charCodeAt(i);
        if (code >= 0x1100 && code <= 0x1112 && CONJOINING_TO_COMPAT[code]) {
          res += CONJOINING_TO_COMPAT[code];
        } else {
          res += nfc[i];
        }
      }
      return res;
    }

    function isPureChosungClient(query) {
      var norm = normalizeHangulQueryClient(query).trim();
      return norm.length > 0 && /^[ㄱ-ㅎ\\s]+$/.test(norm);
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

    function highlightTextClient(text, rawIndices) {
      if (!text) return '';
      if (!rawIndices || rawIndices.length === 0) return escapeHtmlClient(text);

      var sorted = rawIndices.slice().sort(function (a, b) { return a[0] - b[0]; });
      var merged = [sorted[0].slice()];

      for (var i = 1; i < sorted.length; i++) {
        var prev = merged[merged.length - 1];
        var cur = sorted[i];
        if (cur[0] <= prev[1] + 1) {
          prev[1] = Math.max(prev[1], cur[1]);
        } else {
          merged.push(cur.slice());
        }
      }

      var res = '';
      var lastIdx = 0;
      for (var j = 0; j < merged.length; j++) {
        var start = merged[j][0];
        var end = merged[j][1];
        if (start > lastIdx) {
          res += escapeHtmlClient(text.slice(lastIdx, start));
        }
        res += '<mark class="bg-[#fde68a]/20 text-[#fde68a] font-bold px-0.5 border-b border-[#fde68a]/60">' +
          escapeHtmlClient(text.slice(start, end + 1)) +
          '</mark>';
        lastIdx = end + 1;
      }
      if (lastIdx < text.length) {
        res += escapeHtmlClient(text.slice(lastIdx));
      }
      return res;
    }

    function extractSnippetClient(text, indices, radius) {
      if (!text) return '';
      radius = radius || 35;
      if (!indices || indices.length === 0) {
        return text.length > radius * 2 ? (escapeHtmlClient(text.slice(0, radius * 2)) + '...') : escapeHtmlClient(text);
      }

      var matchStart = indices[0][0];
      var matchEnd = indices[0][1];
      var sliceStart = Math.max(0, matchStart - radius);
      var sliceEnd = Math.min(text.length, matchEnd + radius);

      var adjustedIndices = [];
      for (var i = 0; i < indices.length; i++) {
        var s = indices[i][0];
        var e = indices[i][1];
        if (s >= sliceStart && e <= sliceEnd) {
          adjustedIndices.push([s - sliceStart, e - sliceStart]);
        }
      }

      var snippetRaw = text.slice(sliceStart, sliceEnd);
      var highlighted = highlightTextClient(snippetRaw, adjustedIndices);
      var prefix = sliceStart > 0 ? '...' : '';
      var suffix = sliceEnd < text.length ? '...' : '';

      return prefix + highlighted + suffix;
    }

    var searchModal = document.getElementById('search-modal');
    var searchInput = document.getElementById('search-modal-input');
    var searchClearBtn = document.getElementById('search-clear-btn');
    var resultsList = document.getElementById('search-results-list');
    var promptBox = document.getElementById('search-modal-prompt');
    var emptyBox = document.getElementById('search-modal-empty');
    var counterBadge = document.getElementById('search-counter-badge');
    var countNum = document.getElementById('search-count-num');
    var categoryFilterBox = document.getElementById('search-category-filter');
    var activeCatBadge = document.getElementById('search-active-cat-badge');

    var CATEGORY_KEYS = ['ALL', 'FOOD', 'SHELTER', 'TOOLS', 'MATERIALS', 'MEDICINE'];
    var activeSearchCategory = 'ALL';
    var selectedIndex = -1;
    var currentResults = [];
    var searchDebounceTimer = null;
    var previousActiveElement = null;

    // 다차원 싱글톤 Fuse 인스턴스 캐시 맵 (lang + '_' + mode)
    var fuseCache = {};

    function getOrCreateFuse(docs, isChosung, lang) {
      var cacheKey = (lang || 'ko') + '_' + (isChosung ? 'cho' : 'norm');
      if (fuseCache[cacheKey]) {
        return fuseCache[cacheKey];
      }
      var FuseConstructor = window.Fuse;
      if (typeof FuseConstructor !== 'function') return null;

      var options;
      if (isChosung) {
        options = {
          includeMatches: true,
          includeScore: true,
          threshold: 0.25,
          ignoreLocation: true,
          minMatchCharLength: 1,
          keys: [
            { name: 'titleChosung', weight: 0.50 },
            { name: 'summaryChosung', weight: 0.30 },
            { name: 'materialsChosung', weight: 0.20 }
          ]
        };
      } else {
        options = {
          includeMatches: true,
          includeScore: true,
          threshold: 0.35,
          ignoreLocation: true,
          minMatchCharLength: 1,
          keys: [
            { name: 'title', weight: 0.35 },
            { name: 'titleChosung', weight: 0.15 },
            { name: 'summary', weight: 0.17 },
            { name: 'materials', weight: 0.15 },
            { name: 'steps', weight: 0.08 },
            { name: 'deepDives', weight: 0.05 },
            { name: 'categoryName', weight: 0.05 }
          ]
        };
      }
      try {
        var instance = new FuseConstructor(docs, options);
        fuseCache[cacheKey] = instance;
        return instance;
      } catch (err) {
        return null;
      }
    }

    function getActiveDocs() {
      var lang = document.documentElement.lang || 'ko';
      var all = window.__SEARCH_DOCS__ || {};
      return all[lang] || all['ko'] || [];
    }

    function countDocsByCategory(docList) {
      var counts = {};
      for (var i = 0; i < CATEGORY_KEYS.length; i++) {
        counts[CATEGORY_KEYS[i]] = 0;
      }
      counts.ALL = docList.length;
      for (var j = 0; j < docList.length; j++) {
        var cat = docList[j].category;
        if (counts[cat] !== undefined) {
          counts[cat]++;
        }
      }
      return counts;
    }

    function updateCategoryFilterUI(counts) {
      if (categoryFilterBox) {
        var buttons = categoryFilterBox.querySelectorAll('[data-search-category]');
        buttons.forEach(function (btn) {
          var cat = btn.getAttribute('data-search-category');
          var isActive = cat === activeSearchCategory;
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');

          if (isActive) {
            btn.classList.add('bg-white', 'text-black', 'font-bold', 'border-white');
            btn.classList.remove('bg-[#171717]', 'text-neutral-400', 'hover:text-white', 'border-neutral-800', 'hover:border-neutral-600');
          } else {
            btn.classList.remove('bg-white', 'text-black', 'font-bold', 'border-white');
            btn.classList.add('bg-[#171717]', 'text-neutral-400', 'hover:text-white', 'border-neutral-800', 'hover:border-neutral-600');
          }

          var countEl = btn.querySelector('[data-search-cat-count]');
          if (countEl) {
            countEl.className = 'text-[10px] ' + (isActive ? 'text-neutral-700 font-bold' : 'text-neutral-500');
            if (counts && counts[cat] !== undefined) {
              countEl.textContent = String(counts[cat]);
            }
          }
        });
      }

      if (activeCatBadge) {
        if (activeSearchCategory === 'ALL') {
          activeCatBadge.classList.add('hidden');
          activeCatBadge.textContent = '';
        } else {
          var lang = document.documentElement.lang || 'ko';
          var ui = (window.__UI_STRINGS__ && (window.__UI_STRINGS__[lang] || window.__UI_STRINGS__['ko'])) || {};
          var label = ui['cat_' + activeSearchCategory] || ('[' + activeSearchCategory + ']');
          activeCatBadge.textContent = label;
          activeCatBadge.classList.remove('hidden');
        }
      }
    }

    function setSearchCategory(catKey) {
      if (CATEGORY_KEYS.indexOf(catKey) === -1) {
        catKey = 'ALL';
      }
      activeSearchCategory = catKey;

      if (categoryFilterBox) {
        var activeBtn = categoryFilterBox.querySelector('[data-search-category="' + catKey + '"]');
        if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
          try { activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
        }
      }

      executeSearch(searchInput ? searchInput.value : '');
      if (searchInput) {
        searchInput.focus();
      }
    }

    function cycleSearchCategory(dir) {
      var idx = CATEGORY_KEYS.indexOf(activeSearchCategory);
      if (idx === -1) idx = 0;
      var nextIdx = (idx + dir + CATEGORY_KEYS.length) % CATEGORY_KEYS.length;
      setSearchCategory(CATEGORY_KEYS[nextIdx]);
    }

    function openSearchModal() {
      if (!searchModal) return;
      previousActiveElement = document.activeElement;
      searchModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // 언어별 placeholder 및 카테고리 카운트 동기화
      var lang = document.documentElement.lang || 'ko';
      var ui = (window.__UI_STRINGS__ && window.__UI_STRINGS__[lang]) || (window.__UI_STRINGS__ && window.__UI_STRINGS__['ko']) || {};
      if (searchInput && ui.searchPlaceholder) {
        searchInput.placeholder = ui.searchPlaceholder;
      }

      executeSearch(searchInput ? searchInput.value : '');

      setTimeout(function () {
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, 50);
    }

    function closeSearchModal() {
      if (!searchModal) return;
      searchModal.classList.add('hidden');
      document.body.style.overflow = '';
      selectedIndex = -1;
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        try { previousActiveElement.focus(); } catch (e) {}
      }
    }

    function renderResults(results) {
      currentResults = results;
      selectedIndex = -1;
      if (!resultsList) return;

      resultsList.innerHTML = '';

      if (results.length === 0) {
        if (emptyBox) emptyBox.classList.remove('hidden');
        if (promptBox) promptBox.classList.add('hidden');
        if (counterBadge) counterBadge.classList.add('hidden');
        return;
      }

      if (emptyBox) emptyBox.classList.add('hidden');
      if (promptBox) promptBox.classList.add('hidden');
      if (counterBadge) counterBadge.classList.remove('hidden');
      if (countNum) countNum.textContent = results.length;

      var fragment = document.createDocumentFragment();

      results.forEach(function (item, idx) {
        var card = document.createElement('a');
        card.href = item.url;
        card.setAttribute('data-search-idx', idx);
        card.className = 'group block p-3 bg-[#121212] hover:bg-[#1a1a1a] border border-neutral-800 hover:border-neutral-600 transition-colors focus:outline-none focus:bg-[#1a1a1a]';

        card.innerHTML =
          '<div class="flex items-center justify-between text-[10px] text-neutral-500 font-mono mb-1">' +
            '<span class="font-bold uppercase tracking-wider text-neutral-400 group-hover:text-amber-400 transition-colors">' +
              escapeHtmlClient(item.id) + ' // ' + escapeHtmlClient(item.categoryName) +
            '</span>' +
            '<span class="text-[9px] text-neutral-600 group-hover:text-neutral-400 font-mono">SELECT ↵</span>' +
          '</div>' +
          '<div class="text-xs sm:text-sm font-bold text-white leading-snug group-hover:text-neutral-100">' +
            item.titleHighlighted +
          '</div>' +
          (item.snippet ? '<div class="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">' + item.snippet + '</div>' : '');

        fragment.appendChild(card);
      });

      resultsList.appendChild(fragment);
    }

    function mapFuseHitToResult(hit, isChosung, trimmed) {
      var doc = hit.item;
      var matches = hit.matches || [];

      var titleHighlighted = '';
      var titleMatch = matches.find(function (m) {
        return m.key === 'title' || (isChosung && m.key === 'titleChosung');
      });

      if (titleMatch && titleMatch.indices && titleMatch.indices.length > 0) {
        titleHighlighted = highlightTextClient(doc.title, titleMatch.indices);
      } else {
        // 원본 텍스트 매칭 인덱스 기반 개별 이스케이프로 HTML 엔티티 파괴 방지
        var lowerTitle = doc.title.toLowerCase();
        var lowerTrimmed = trimmed.toLowerCase();
        var fallbackIndices = [];
        var pos = 0;
        while ((pos = lowerTitle.indexOf(lowerTrimmed, pos)) !== -1) {
          fallbackIndices.push([pos, pos + trimmed.length - 1]);
          pos += trimmed.length;
        }
        if (fallbackIndices.length > 0) {
          titleHighlighted = highlightTextClient(doc.title, fallbackIndices);
        } else {
          titleHighlighted = escapeHtmlClient(doc.title);
        }
      }

      var snippet = '';
      var summaryMatch = matches.find(function (m) {
        return m.key === 'summary' || (isChosung && m.key === 'summaryChosung');
      });
      var materialsMatch = matches.find(function (m) {
        return m.key === 'materials' || (isChosung && m.key === 'materialsChosung');
      });
      var stepsMatch = matches.find(function (m) { return m.key === 'steps'; });
      var deepDivesMatch = matches.find(function (m) { return m.key === 'deepDives'; });

      if (summaryMatch && summaryMatch.indices && summaryMatch.indices.length > 0) {
        snippet = extractSnippetClient(doc.summary, summaryMatch.indices);
      } else if (materialsMatch && materialsMatch.indices && materialsMatch.indices.length > 0) {
        snippet = '[#] ' + extractSnippetClient(doc.materials, materialsMatch.indices);
      } else if (stepsMatch && stepsMatch.indices && stepsMatch.indices.length > 0) {
        snippet = '[STEP] ' + extractSnippetClient(doc.steps, stepsMatch.indices);
      } else if (deepDivesMatch && deepDivesMatch.indices && deepDivesMatch.indices.length > 0) {
        snippet = '[NOTE] ' + extractSnippetClient(doc.deepDives, deepDivesMatch.indices);
      } else {
        snippet = doc.summary.length > 80 ? (escapeHtmlClient(doc.summary.slice(0, 80)) + '...') : escapeHtmlClient(doc.summary);
      }

      return {
        id: doc.id,
        url: doc.url,
        category: doc.category,
        categoryName: doc.categoryName,
        title: doc.title,
        titleHighlighted: titleHighlighted,
        snippet: snippet,
        score: hit.score || 1.0
      };
    }

    function executeSearch(query) {
      var trimmed = (query || '').trim();
      var docs = getActiveDocs();

      if (!trimmed) {
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
        updateCategoryFilterUI(countDocsByCategory(docs));

        if (activeSearchCategory === 'ALL') {
          if (resultsList) resultsList.innerHTML = '';
          if (promptBox) promptBox.classList.remove('hidden');
          if (emptyBox) emptyBox.classList.add('hidden');
          if (counterBadge) counterBadge.classList.add('hidden');
          currentResults = [];
          selectedIndex = -1;
          return;
        }

        var browseItems = [];
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          if (doc.category === activeSearchCategory) {
            browseItems.push({
              id: doc.id,
              url: doc.url,
              category: doc.category,
              categoryName: doc.categoryName,
              title: doc.title,
              titleHighlighted: escapeHtmlClient(doc.title),
              snippet: doc.summary.length > 80 ? (escapeHtmlClient(doc.summary.slice(0, 80)) + '...') : escapeHtmlClient(doc.summary),
              score: 0
            });
          }
        }
        renderResults(browseItems);
        return;
      }

      if (searchClearBtn) searchClearBtn.classList.remove('hidden');

      var isChosung = isPureChosungClient(trimmed);
      var lang = document.documentElement.lang || 'ko';

      var fuse = getOrCreateFuse(docs, isChosung, lang);
      if (fuse) {
        var allHits = [];
        try {
          allHits = fuse.search(trimmed, { limit: docs.length || 100 });
        } catch (e) {
          allHits = [];
        }

        var matchedDocs = allHits.map(function (h) { return h.item; });
        updateCategoryFilterUI(countDocsByCategory(matchedDocs));

        var filteredHits = activeSearchCategory === 'ALL'
          ? allHits.slice(0, 12)
          : allHits.filter(function (h) { return h.item.category === activeSearchCategory; }).slice(0, 30);

        var mapped = filteredHits.map(function (hit) {
          return mapFuseHitToResult(hit, isChosung, trimmed);
        });

        renderResults(mapped);
      } else {
        // Fallback: Fuse 로드 전 단순 부분 문자열 매칭
        var lowerQuery = trimmed.toLowerCase();
        var allSimpleHits = [];
        docs.forEach(function (doc) {
          var titleMatch = doc.title.toLowerCase().indexOf(lowerQuery) !== -1;
          var chosungMatch = doc.titleChosung && doc.titleChosung.indexOf(trimmed) !== -1;
          var summaryMatch = doc.summary.toLowerCase().indexOf(lowerQuery) !== -1;
          var catMatch = doc.categoryName && doc.categoryName.toLowerCase().indexOf(lowerQuery) !== -1;

          if (titleMatch || chosungMatch || summaryMatch || catMatch) {
            allSimpleHits.push({
              id: doc.id,
              url: doc.url,
              category: doc.category,
              categoryName: doc.categoryName,
              title: doc.title,
              titleHighlighted: escapeHtmlClient(doc.title),
              snippet: doc.summary.length > 80 ? (escapeHtmlClient(doc.summary.slice(0, 80)) + '...') : escapeHtmlClient(doc.summary),
              score: 0.1
            });
          }
        });

        updateCategoryFilterUI(countDocsByCategory(allSimpleHits));

        var scopedSimpleHits = activeSearchCategory === 'ALL'
          ? allSimpleHits.slice(0, 12)
          : allSimpleHits.filter(function (item) { return item.category === activeSearchCategory; }).slice(0, 30);

        renderResults(scopedSimpleHits);
      }
    }

    function updateKeyboardSelection() {
      if (!resultsList) return;
      var cards = resultsList.querySelectorAll('[data-search-idx]');
      cards.forEach(function (card, idx) {
        if (idx === selectedIndex) {
          card.classList.add('bg-[#222222]', 'border-neutral-500');
          card.classList.remove('bg-[#121212]', 'border-neutral-800');
          card.scrollIntoView({ block: 'nearest' });
        } else {
          card.classList.remove('bg-[#222222]', 'border-neutral-500');
          card.classList.add('bg-[#121212]', 'border-neutral-800');
        }
      });
    }

    // 1. 입력 이벤트 처리 (Debounced 120ms)
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        var val = e.target.value;
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
          executeSearch(val);
        }, 120);
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
          executeSearch('');
        }
      });
    }

    // 2. 키보드 단축키 (Cmd+K / Ctrl+K / / / ESC / Tab / 방향키 / Enter)
    document.addEventListener('keydown', function (e) {
      var isK = e.key === 'k' || e.key === 'K';
      var isSlash = e.key === '/';
      var isMod = e.metaKey || e.ctrlKey || e.altKey;

      var activeEl = document.activeElement;
      var isInputActive = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);

      if (((e.metaKey || e.ctrlKey) && isK) || (isSlash && !isMod && !isInputActive)) {
        e.preventDefault();
        if (searchModal && !searchModal.classList.contains('hidden')) {
          closeSearchModal();
        } else {
          openSearchModal();
        }
        return;
      }

      if (!searchModal || searchModal.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchModal();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleSearchCategory(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentResults.length > 0) {
          selectedIndex = (selectedIndex + 1) % currentResults.length;
          updateKeyboardSelection();
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentResults.length > 0) {
          if (selectedIndex <= 0) {
            selectedIndex = currentResults.length - 1;
          } else {
            selectedIndex--;
          }
          updateKeyboardSelection();
        }
        return;
      }

      if (e.key === 'Enter') {
        // macOS 한글 IME 조합 중에는 엔터키로 인한 페이지 이동 차단
        if (e.isComposing || e.keyCode === 229) {
          return;
        }
        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
          searchDebounceTimer = null;
          executeSearch(searchInput ? searchInput.value : '');
        }
        if (currentResults.length > 0) {
          e.preventDefault();
          var targetItem = selectedIndex >= 0 ? currentResults[selectedIndex] : currentResults[0];
          if (targetItem && targetItem.url) {
            window.location.href = targetItem.url;
          }
        }
      }
    });

    // 3. 모달 외부 클릭 시 닫기, 카테고리 칩 클릭 전환 & 트리거 버튼 클릭 시 열기
    document.addEventListener('click', function (e) {
      var openTrigger = e.target.closest('[data-action="open-search"]');
      if (openTrigger) {
        e.preventDefault();
        openSearchModal();
        return;
      }

      var closeTrigger = e.target.closest('[data-action="close-search"]');
      if (closeTrigger) {
        e.preventDefault();
        closeSearchModal();
        return;
      }

      var catTrigger = e.target.closest('[data-action="search-category"]');
      if (catTrigger) {
        e.preventDefault();
        var catKey = catTrigger.getAttribute('data-search-category') || 'ALL';
        setSearchCategory(catKey);
        return;
      }

      if (e.target === searchModal) {
        closeSearchModal();
      }
    });

  })();
  `.trim();
}
