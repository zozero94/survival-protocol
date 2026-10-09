import type { SupportedLocale } from '../../i18n/locales.ts';

/**
 * [Presentational Component]
 * 상단 글로벌 헤더 컴포넌트 (Stitch Minimalist Technical Nav)
 * 수동 스위처/테마 토글 등 불필요 요소 전면 제거, 브라우저 헤더 자동 감지 기반
 */
export function renderHeader(
  categoryName: string,
  protocolTitle: string,
  _currentLocale: SupportedLocale = 'ko'
): string {
  return `
<header class="sticky top-0 z-40 bg-[#131313]/95 backdrop-blur border-b border-[#2d2d2d] transition-colors">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between font-mono text-xs">
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
    
    <div class="flex items-center gap-1 text-[10px] text-emerald-400 font-mono border border-emerald-900/60 bg-emerald-950/20 px-2 py-0.5">
      <span class="inline-block w-1.5 h-1.5 bg-emerald-400 animate-pulse"></span>
      <span>OFFLINE READY</span>
    </div>
  </div>
</header>
  `.trim();
}
