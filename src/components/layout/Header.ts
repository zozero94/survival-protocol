import type { SupportedLocale } from '../../i18n/locales.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';

/**
 * [Presentational Component]
 * 상단 글로벌 헤더 컴포넌트 (Stitch Technical Minimalist Nav)
 * 선언적 data-i18n, data-proto 및 data-action="switch-locale" 100% 보존
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
        <button type="button" data-action="switch-locale" data-locale-btn="${l.code}" class="px-1.5 py-0.5 text-[11px] font-mono font-bold transition-colors ${
        isSelected ? 'bg-white text-black' : 'text-[#888] hover:text-white'
      }">${l.label}</button>
      `;
    })
    .join('');

  return `
<header class="sticky top-0 z-40 bg-[#131313]/95 backdrop-blur border-b border-[#2d2d2d] transition-colors">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
    <div class="flex items-center space-x-2">
      <a href="/" class="font-bold text-white tracking-widest hover:text-white/80 transition-colors flex items-center gap-1.5">
        <span class="inline-block w-2 h-2 bg-white"></span>
        [생존 교범]
      </a>
      <span class="text-[#555] font-normal">/</span>
      <div class="flex items-center gap-1 text-[#888] text-[11px] truncate">
        <span id="proto-header-category" data-proto="category">${categoryName}</span>
        <span>&gt;</span>
        <span id="proto-header-title" data-proto="title" class="text-neutral-300 font-semibold truncate max-w-[200px] sm:max-w-xs">${protocolTitle}</span>
      </div>
    </div>
    
    <div class="flex items-center justify-between sm:justify-end space-x-2.5 text-[11px] text-[#777]">
      <!-- Multilingual Hot-Swapper (Zero Reload) -->
      <div class="flex items-center border border-[#333] px-1 py-0.5 bg-[#171717]">
        ${switcherHtml}
      </div>
      
      <!-- Theme Switcher -->
      <button type="button" data-action="toggle-theme" class="border border-[#333] px-2 py-0.5 text-[#aaa] hover:text-white hover:border-[#555] transition-colors flex items-center gap-1 font-mono">
        <span id="mode-icon">◐</span>
        <span id="mode-label" class="hidden md:inline">야간 전술</span>
      </button>

      <!-- Network / Offline Indicator -->
      <div class="flex items-center gap-1 text-[10px] text-emerald-400 font-mono border border-emerald-900/60 bg-emerald-950/20 px-1.5 py-0.5">
        <span class="inline-block w-1.5 h-1.5 bg-emerald-400 animate-pulse"></span>
        <span>PWA READY</span>
      </div>
    </div>
  </div>
</header>
  `.trim();
}
