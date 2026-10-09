/**
 * [Presentational Component]
 * 하단 고정 액션 바 컴포넌트 (Stitch Tactical Sticky Bottom Bar)
 * 선언적 data-i18n 및 data-action 100% 보존
 */
export function renderStickyActionBar(nextProtocolTitle?: string): string {
  const nextBtn = nextProtocolTitle
    ? `<a id="ui-next-link" data-proto-action="next-protocol" class="py-2 px-3 bg-white text-black font-bold border border-white hover:bg-[#eee] transition-colors flex items-center gap-1 text-[11px] shrink-0" href="#">
        <span id="ui-next-text" data-proto="nextProtocolTitle">${nextProtocolTitle}</span>
        <span>→</span>
       </a>`
    : '';

  return `
<aside class="fixed bottom-0 left-0 right-0 z-50 bg-[#101010]/95 backdrop-blur border-t border-[#333] px-3 py-2.5 transition-colors">
  <div class="max-w-4xl mx-auto flex items-center justify-between gap-2 font-mono text-xs">
    <div class="flex items-center gap-2">
      <a class="px-3 py-2 bg-[#1f1f1f] text-[#bbb] border border-[#3a3a3a] hover:text-white hover:border-[#666] transition-colors flex items-center gap-1 shrink-0" href="/">
        <span>←</span> <span id="ui-all-protocols" data-i18n="allProtocols">전체 목차</span>
      </a>
      ${nextBtn}
    </div>
    <div class="flex items-center gap-2">
      <button type="button" data-action="save-offline" class="py-2 px-3 bg-[#252525] text-white border border-[#444] hover:bg-[#333] hover:border-[#777] active:bg-white active:text-black transition-colors flex items-center gap-1.5 text-[11px]">
        <span>💾</span>
        <span id="ui-btn-save" data-i18n="saveOffline">오프라인 저장 (A4/PDF)</span>
      </button>
      <button type="button" data-action="share-protocol" class="py-2 px-2.5 bg-[#171717] text-[#888] border border-[#333] hover:text-white hover:border-[#555] transition-colors flex items-center gap-1 text-[11px]">
        <span>🔗</span>
        <span id="ui-btn-share" data-i18n="share">공유</span>
      </button>
    </div>
  </div>
</aside>
  `.trim();
}
