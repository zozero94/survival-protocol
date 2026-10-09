/**
 * [Presentational Component]
 * 하단 고정 액션 바 컴포넌트
 * 선언적 data-i18n 및 data-action 완전 적용
 */
export function renderStickyActionBar(nextProtocolTitle?: string): string {
  const nextBtn = nextProtocolTitle
    ? `<a id="ui-next-link" data-proto-action="next-protocol" class="font-mono text-xs font-bold uppercase tracking-wider px-3 py-2 border border-white text-white hover:bg-white hover:text-black flex items-center gap-2 transition-all" href="#">
        <span id="ui-next-text" data-proto="nextProtocolTitle">${nextProtocolTitle}</span>
        <span>→</span>
       </a>`
    : '';

  return `
<aside class="fixed bottom-0 left-0 right-0 z-50 bg-black/95 dark:bg-black/95 border-t-2 border-white backdrop-blur-sm px-4 sm:px-8 py-3 transition-colors">
  <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
    <div class="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
      <a class="font-mono text-xs font-bold uppercase tracking-wider px-3 py-2 border border-white/40 text-neutral-300 hover:text-white hover:border-white flex items-center gap-1 transition-all" href="/">
        <span>←</span> <span id="ui-all-protocols" data-i18n="allProtocols">전체 교범 인덱스</span>
      </a>
      <span class="text-white/20 hidden sm:inline">|</span>
      ${nextBtn}
    </div>
    <div class="flex items-center gap-2 w-full md:w-auto">
      <button type="button" data-action="save-offline" class="flex-1 md:flex-initial font-mono text-xs font-bold uppercase tracking-wider px-3 py-2 border border-white bg-white text-black hover:bg-transparent hover:text-white transition-all flex items-center justify-center gap-1.5">
        <span>💾</span>
        <span id="ui-btn-save" data-i18n="saveOffline">오프라인 저장 (A4/PDF)</span>
      </button>
      <button type="button" data-action="share-protocol" class="flex-1 md:flex-initial font-mono text-xs font-bold uppercase tracking-wider px-3 py-2 border border-white/40 bg-black text-neutral-300 hover:text-white hover:border-white transition-all flex items-center justify-center gap-1.5">
        <span>🔗</span>
        <span id="ui-btn-share" data-i18n="share">공유</span>
      </button>
    </div>
  </div>
</aside>
  `.trim();
}
