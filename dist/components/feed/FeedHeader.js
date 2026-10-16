                                                                      
import { renderSearchTriggerButton } from '../layout/SearchModal.js';

/**
 * [Presentational Component]
 * 메인 피드 인덱스 대문 헤더 (Stitch 디자인 1:1 완벽 이식 + 7개국어 선언적 data-i18n 바인딩)
 * 7대 카테고리 필터 칩 + 오프라인 펄스 인디케이터 + 킬러 대문 선언문
 */
export function renderFeedHeader(totalCount        )         {
  const categories                                                     = [
    { key: 'ALL', label: '[전체]' },
    { key: 'WATER', label: '[물 구하기]' },
    { key: 'FIRE', label: '[불 피우기]' },
    { key: 'SHELTER', label: '[움막 짓기]' },
    { key: 'FOOD', label: '[식량 구하기]' },
    { key: 'TOOLS', label: '[도구 만들기]' },
    { key: 'MEDICINE', label: '[응급 처치]' },
  ];

  const categoryTabs = categories
    .map(
      (cat, idx) => `
    <button type="button"
      data-action="filter-category"
      data-category="${cat.key}"
      data-i18n="cat_${cat.key}"
      class="px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 transition-none ${
        idx === 0
          ? 'bg-white text-black font-bold'
          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
      }">
      ${cat.label}
    </button>
  `
    )
    .join('');

  return `
<!-- 상단 긴급 고정 헤더 레일 -->
<header class="border-b border-neutral-800 bg-black/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
  <div class="max-w-5xl mx-auto flex items-center justify-between gap-3">
    <div class="flex flex-col gap-0.5 min-w-0">
      <div class="flex items-center gap-2">
        <span data-i18n="feedHeaderTitle" class="font-mono text-xs sm:text-sm font-black tracking-widest text-white uppercase truncate">[생존 교범 // SURVIVAL PROTOCOL]</span>
      </div>
      <div class="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400 truncate">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
        <span data-i18n="feedCacheActive" class="truncate">오프라인 자동 저장 켜짐 (인터넷이 끊겨도 언제든 볼 수 있습니다)</span>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      ${renderSearchTriggerButton()}
      <div class="font-mono text-[11px] text-neutral-400 border border-neutral-800 px-2 py-1 hidden md:block">
        CATALOG: <span class="text-white font-bold">${totalCount}</span> PROTOCOLS
      </div>
    </div>
  </div>
</header>

<!-- 메인 선언문 배너 -->
<section class="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-8 pb-4">
  <div class="border-b-2 border-white/20 pb-6">
    <div class="font-mono text-[11px] text-neutral-500 uppercase tracking-widest mb-2">
      SURVIVAL GUIDE // FIELD MANUAL
    </div>
    <h1 data-i18n="feedHeroHeadline" class="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-white uppercase leading-snug">
      전기와 도구가 모두 사라졌을 때, 맨손과 자연물만으로 살아남는 법.
    </h1>
    <p data-i18n="feedHeroSubtext" class="text-neutral-400 text-xs sm:text-sm mt-3 max-w-2xl leading-relaxed">
      주변에서 쉽게 구할 수 있는 나무, 돌, 흙, 낙엽만으로 물과 불, 거처를 만드는 실전 생존 가이드입니다.
      한 번 열어본 글은 기기에 자동 저장되어 인터넷이나 통신이 끊긴 곳에서도 그대로 볼 수 있습니다.
    </p>
  </div>
</section>

<!-- 7대 퀵 카테고리 필터 칩 레일 + 최신순/오래된순 정렬 토글 -->
<section class="max-w-5xl mx-auto w-full px-4 sm:px-8 py-3">
  <div class="flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0" id="category-filter">
      ${categoryTabs}
    </div>
    <div class="flex items-center shrink-0 pb-1">
      <button type="button"
        id="sort-toggle-btn"
        data-action="toggle-sort"
        data-sort="latest"
        class="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 cursor-pointer transition-colors">
        <span class="text-neutral-500 text-[10px]">SORT:</span>
        <span id="sort-toggle-label" data-i18n="sort_latest">최신순</span>
        <span id="sort-toggle-arrow" class="text-[10px] text-neutral-400">▼</span>
      </button>
    </div>
  </div>
</section>
  `.trim();
}
