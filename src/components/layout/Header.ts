import type { SupportedLocale } from '../../i18n/locales.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';

/**
 * [Presentational Component]
 * 상단 글로벌 헤더 컴포넌트
 * 선언적 data-i18n, data-proto 및 data-action="switch-locale" 완전 적용
 */
export function renderHeader(
  categoryName: string,
  protocolTitle: string,
  currentLocale: SupportedLocale = 'ko'
): string {
  const ui = UI_STRINGS[currentLocale] || UI_STRINGS.ko;

  const locales: { code: SupportedLocale; label: string }[] = [
    { code: 'ko', label: 'KO' },
    { code: 'en', label: 'EN' },
    { code: 'ja', label: 'JA' },
    { code: 'es', label: 'ES' },
    { code: 'de', label: 'DE' },
    { code: 'pt', label: 'PT' },
    { code: 'zh-TW', label: 'ZH' },
  ];

  const switcherHtml = locales
    .map((l) => {
      const isSelected = l.code === currentLocale;
      return `
        <button type="button" data-action="switch-locale" data-locale-btn="${l.code}" class="px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all ${
        isSelected ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
      }">${l.label}</button>
      `;
    })
    .join('');

  return `
<header class="border-b-2 border-white dark:border-white bg-black dark:bg-black sticky top-0 z-40 px-4 sm:px-8 py-4 transition-colors">
  <div class="max-w-5xl mx-auto flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a class="font-mono text-base sm:text-xl font-black tracking-tighter bg-white text-black px-2.5 py-0.5 border border-black hover:invert transition-all" href="/">[생존 교범]</a>
        <span id="ui-brand-archive" data-i18n="brandArchive" class="font-mono text-xs uppercase tracking-wider text-neutral-400 hidden sm:inline-block border-l border-white/30 pl-3">${ui.brandArchive}</span>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Multilingual Hot-Swapper (Zero Reload) -->
        <div class="flex items-center border border-white/40 px-1 py-0.5 bg-neutral-950">
          <span class="text-neutral-400 text-xs px-1 select-none">🌐</span>
          ${switcherHtml}
        </div>
        <button type="button" data-action="toggle-theme" class="font-mono text-xs border border-white/40 px-2.5 py-1 text-neutral-300 hover:text-white hover:border-white flex items-center gap-1.5 transition-all">
          <span id="mode-icon">◐</span>
          <span id="mode-label" class="hidden sm:inline">야간 전술 [다크]</span>
        </button>
        <a data-i18n="offlineDb" class="px-2.5 py-1 border border-white bg-white text-black font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-all hidden md:inline-block" href="#">${ui.offlineDb}</a>
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/20 text-xs font-mono">
      <div class="flex items-center gap-2 text-neutral-400">
        <a class="text-white hover:underline flex items-center gap-1 font-bold" href="/">
          <span class="text-neutral-400 font-normal">←</span>
          <span id="ui-back-index" data-i18n="backToIndex">${ui.backToIndex}</span>
        </a>
        <span class="text-white/30">/</span>
        <span id="proto-header-category" data-proto="category" class="hover:text-white">${categoryName}</span>
        <span class="text-white/30">/</span>
        <span id="proto-header-title" data-proto="title" class="text-white font-semibold">${protocolTitle}</span>
      </div>
      <a class="hidden md:inline-flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white hover:underline border border-white/30 px-2 py-0.5" href="/">
        <span data-i18n="backToIndex">${ui.backToIndex}</span>
      </a>
    </div>
  </div>
</header>
  `.trim();
}
