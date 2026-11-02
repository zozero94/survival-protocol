import {
  FEED_CATEGORY_KEYS,
  type FeedCategoryKey,
} from '../../types/protocol.types.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';
import { renderSearchTriggerButton } from '../layout/SearchModal.ts';

/**
 * [Presentational Component]
 * 메인 피드 인덱스 대문 헤더 (Stitch 디자인 1:1 완벽 이식 + 7개국어 선언적 data-i18n 바인딩)
 * SSOT 기반 5대 핵심 카테고리 필터 칩 + 오프라인 펄스 인디케이터 + 킬러 대문 선언문
 */
export function renderFeedHeader(totalCount: number): string {
  const categoryTabs = FEED_CATEGORY_KEYS.map((key, idx) => {
    const defaultLabel = (UI_STRINGS.ko as unknown as Record<string, string>)[`cat_${key}`] || `[${key}]`;
    return `
    <button type="button"
      data-action="filter-category"
      data-category="${key}"
      data-i18n="cat_${key}"
      class="px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 transition-none ${
        idx === 0
          ? 'bg-white text-black font-bold'
          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
      }">
      ${defaultLabel}
    </button>
  `;
  }).join('');

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
      재난에서 살아남기
    </h1>
    <p data-i18n="feedHeroSubtext" class="text-neutral-400 text-xs sm:text-sm mt-3 max-w-2xl leading-relaxed">
      문명이 멈추고 전기와 수도가 끊긴 극한의 재난·전쟁·도시 마비 위기에서 살아남는 실전 행동 수칙입니다.
      주변의 버려진 생활용품(깡통·페트병·비닐·호일)과 자연물만으로 물, 불, 난방, 조리, 방호 문제를 해결하는 기술을 기록합니다.
      (포스트 아포칼립스 생존 아카이브 / 1회 방문 시 오프라인 영구 보존)
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
