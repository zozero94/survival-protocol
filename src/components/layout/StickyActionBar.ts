/**
 * [Presentational Component]
 * 하단 고정 액션 바 컴포넌트 (Stitch Tactical Sticky Bottom Bar)
 * 선언적 data-i18n 및 data-action 100% 보존
 * 모바일 최소 44px 터치 타겟, Safe Area 패딩 및 A11y aria-pressed 지원
 */
export function renderStickyActionBar(nextProtocolTitle?: string, nextProtocolHref: string = '/'): string {
  const nextBtn = nextProtocolTitle
    ? `<a id="ui-next-link" data-action="navigate-next" data-proto-action="next-protocol" class="min-h-[44px] py-2 px-3 bg-white text-black font-bold border border-white hover:bg-[#eee] transition-colors flex items-center justify-center sm:justify-start gap-1.5 text-[11px] flex-1 min-w-0 sm:flex-initial sm:max-w-xs md:max-w-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" href="${nextProtocolHref}">
        <span id="ui-next-text" data-proto="nextProtocolTitle" class="truncate">${nextProtocolTitle}</span>
        <span class="shrink-0 font-mono">→</span>
       </a>`
    : '';

  return `
<aside class="no-print fixed bottom-0 left-0 right-0 z-50 bg-[#101010]/95 backdrop-blur border-t border-[#333] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] transition-colors">
  <div class="max-w-4xl mx-auto flex items-center justify-between gap-2 font-mono text-xs">
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <a data-action="navigate-index" class="min-h-[44px] px-2.5 sm:px-3 py-2 bg-[#1f1f1f] text-[#bbb] border border-[#3a3a3a] hover:text-white hover:border-[#666] transition-colors flex items-center gap-1 shrink-0 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#888]" href="/">
        <span>←</span> <span id="ui-all-protocols" data-i18n="allProtocols">전체 목차</span>
      </a>
      <button id="btn-like-protocol" type="button" data-action="toggle-like" aria-pressed="false" class="min-h-[44px] px-2.5 sm:px-3 py-2 bg-[#191919] text-[#999] border border-[#333] hover:text-white hover:border-[#666] transition-colors flex items-center gap-1.5 shrink-0 text-[11px] font-mono font-bold uppercase rounded-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fde68a]">
        <svg id="icon-like" class="w-3.5 h-3.5 shrink-0 transition-colors" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2"/></svg>
        <span id="ui-like-text" data-i18n="confirmSurvival" class="hidden sm:inline">생존 확인</span>
        <span id="proto-likes-count" class="bg-[#111] px-1.5 py-0.5 text-[10px] border border-[#2a2a2a] text-white font-mono ml-0.5 tabular-nums min-w-[18px] text-center inline-block">0</span>
      </button>
    </div>
    ${nextBtn}
  </div>
</aside>
  `.trim();
}
