import type { SupportedLocale } from '../../i18n/locales.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';

/**
 * [Presentational Component]
 * Stitch 다크 택티컬 인메모리 검색 모달 대화창 (Search Modal Dialog)
 * Cmd+K / Ctrl+K / '/' 단축키 및 방향키 탐색, 초성 검색, 100% 오프라인 지원
 */
export function renderSearchModal(locale: SupportedLocale = 'ko'): string {
  const ui = UI_STRINGS[locale] || UI_STRINGS.ko;

  return `
<!-- SEARCH MODAL (Stitch Dark Tactical Instant Search) -->
<div id="search-modal" class="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 px-3 sm:px-4 bg-black/85 backdrop-blur-md hidden transition-all" role="dialog" aria-modal="true" aria-label="Search Protocols">
  <style>
    #search-modal-input::-webkit-search-cancel-button,
    #search-modal-input::-webkit-search-decoration {
      -webkit-appearance: none;
      appearance: none;
      display: none;
    }
    #search-modal-results {
      overscroll-behavior: contain;
    }
  </style>
  <div class="bg-[#0e0e0e] border border-neutral-700/80 w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[82vh] overflow-hidden text-neutral-200 font-mono">
    
    <!-- 모달 상단 검색창 바 -->
    <div class="flex items-center gap-2 px-3.5 py-3 border-b border-neutral-800 bg-[#141414]">
      <span class="text-neutral-500 text-sm">🔍</span>
      <input
        id="search-modal-input"
        type="search"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        data-i18n-placeholder="searchPlaceholder"
        placeholder="${ui.searchPlaceholder}"
        class="flex-1 bg-transparent border-none text-white text-base sm:text-sm placeholder-neutral-500 focus:outline-none tracking-wide"
      />
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          id="search-clear-btn"
          class="hidden px-1.5 py-0.5 text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer"
          title="Clear">
          ✕
        </button>
        <button
          type="button"
          data-action="close-search"
          class="px-2 py-0.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-900 transition-colors sm:hidden cursor-pointer"
          aria-label="Close"
          title="Close">
          [ESC]
        </button>
        <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 uppercase font-mono">
          ESC
        </kbd>
      </div>
    </div>

    <!-- 상태 및 인디케이터 바 -->
    <div class="flex items-center justify-between px-3.5 py-1.5 bg-[#0a0a0a] border-b border-neutral-800/80 text-[10px] text-neutral-400">
      <div class="flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span data-i18n="searchBadge" class="uppercase tracking-wider font-bold text-neutral-300">
          ${ui.searchBadge}
        </span>
      </div>
      <div id="search-counter-badge" class="hidden text-neutral-400">
        <span id="search-count-num" class="text-amber-400 font-bold">0</span> <span data-i18n="searchResultsCount">${ui.searchResultsCount}</span>
      </div>
    </div>

    <!-- 검색 결과 목록 스크롤 영역 -->
    <div id="search-modal-results" class="flex-1 overflow-y-auto divide-y divide-neutral-900/80 p-2 space-y-1 scrollbar-thin">
      <!-- 초기 안내 상태 -->
      <div id="search-modal-prompt" class="p-8 text-center text-neutral-500 text-xs">
        <p class="font-bold text-neutral-400 mb-1">// PRIMITIVE SURVIVAL TACTICAL SEARCH</p>
        <p data-i18n="searchPrompt" class="text-[11px] text-neutral-500 leading-relaxed">
          ${ui.searchPrompt}
        </p>
      </div>

      <!-- 일치 결과 없음 상태 -->
      <div id="search-modal-empty" class="hidden p-8 text-center text-neutral-500 text-xs">
        <p class="text-red-400 font-bold mb-1">[!] NO MATCH</p>
        <p data-i18n="searchNoResults" class="text-neutral-400 text-[11px]">
          ${ui.searchNoResults}
        </p>
      </div>

      <!-- 동적 검색 결과 카드 컨테이너 -->
      <div id="search-results-list" class="flex flex-col gap-1.5"></div>
    </div>

    <!-- 하단 퀵 내비게이션 안내 바 -->
    <div class="px-3.5 py-2 bg-[#121212] border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500">
      <span data-i18n="searchShortcutHint">
        ${ui.searchShortcutHint}
      </span>
      <span class="text-neutral-600 hidden sm:inline">
        PRIMITIVE SURVIVAL ARCHIVE
      </span>
    </div>

  </div>
</div>
  `.trim();
}

/**
 * 상단 헤더에 배치할 검색 트리거 버튼 마크업 생성
 */
export function renderSearchTriggerButton(): string {
  return `
<button
  type="button"
  data-action="open-search"
  class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-600 transition-colors shrink-0 cursor-pointer"
  title="Search (Cmd+K / /)">
  <span class="text-neutral-400 text-[11px]">🔍</span>
  <span data-i18n="searchBtn" class="hidden sm:inline">[검색]</span>
  <kbd class="hidden md:inline-block px-1 py-0.2 text-[9px] text-neutral-400 bg-neutral-950 border border-neutral-800">
    ⌘K
  </kbd>
</button>
  `.trim();
}
