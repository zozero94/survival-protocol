import type { SupportedLocale } from '../../i18n/locales.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';
import { renderSearchTriggerButton } from './SearchModal.ts';

/**
 * [Presentational Component]
 * 상단 글로벌 헤더 컴포넌트 (Stitch Minimalist Technical Nav)
 * 수동 스위처/테마 토글 등 불필요 요소 전면 제거, 브라우저 헤더 자동 감지 기반
 */
export function renderHeader(
  categoryName: string,
  protocolTitle: string,
  currentLocale: SupportedLocale = 'ko'
): string {
  const catI18nKey = `cat_${categoryName}` as keyof (typeof UI_STRINGS)['ko'];
  const localizedCat = UI_STRINGS[currentLocale]?.[catI18nKey] || UI_STRINGS.ko[catI18nKey] || categoryName;
  return `
<header class="sticky top-0 z-40 bg-[#131313]/95 backdrop-blur border-b border-[#2d2d2d] transition-colors">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 font-mono text-xs">
    <div class="flex items-center space-x-2 min-w-0">
      <a href="/" class="font-bold text-white tracking-widest hover:text-white/80 transition-colors flex items-center gap-1.5 shrink-0">
        <span class="inline-block w-2 h-2 bg-white"></span>
        <span data-i18n="brandShort">[생존 교범]</span>
      </a>
      <span class="text-[#555] font-normal">/</span>
      <div class="flex items-center gap-1 text-[#888] text-[11px] truncate">
        <span id="proto-header-category" data-i18n="cat_${categoryName}" data-proto="category">${localizedCat}</span>
        <span>&gt;</span>
        <span id="proto-header-title" data-proto="title" class="text-neutral-300 font-semibold truncate max-w-[180px] sm:max-w-md">${protocolTitle}</span>
      </div>
    </div>
    <div class="flex items-center shrink-0">
      ${renderSearchTriggerButton()}
    </div>
  </div>
</header>
  `.trim();
}
