/**
 * [Presentational Layer]
 * Stitch 다크 브루탈리즘 택티컬 호버 프리뷰 팝오버 (Tactical Cross-Link Preview Card)
 * - 본문 및 준비물 내 인라인 크로스링크(`a[data-proto="crosslink"]`)에 마우스 오버 시
 *   대상 프로토콜의 16:9 대표 썸네일 도면/실사, 카테고리, 소요 시간, 제목, 2줄 핵심 요약, 주요 준비물을
 *   즉시 플로팅 HUD 카드로 표시합니다.
 */
export function renderCrosslinkPopover()         {
  return `
    <div
      id="tactical-crosslink-popover"
      role="tooltip"
      aria-hidden="true"
      class="no-print fixed z-[95] hidden opacity-0 pointer-events-none w-[320px] sm:w-[356px] bg-[#0a0a0a] border border-[#fde68a] shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-opacity duration-75 select-none"
      style="border-radius: 0px;"
    >
      <!-- 네 모서리 택티컬 조준 십자(+) 마커 -->
      <span class="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#fde68a] pointer-events-none"></span>
      <span class="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-[#fde68a] pointer-events-none"></span>
      <span class="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-[#fde68a] pointer-events-none"></span>
      <span class="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#fde68a] pointer-events-none"></span>

      <a
        id="popover-card-link"
        href="#"
        class="block text-left no-underline focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#fde68a] group"
      >
        <!-- 1. 상단 텔레메트리 헤더 바 -->
        <div class="bg-[#121212] border-b border-[#262626] px-3 py-1.5 flex items-center justify-between gap-2 font-mono text-[10px]">
          <span
            id="popover-category"
            class="text-[#fde68a] font-bold tracking-wider uppercase bg-[#221f14] border border-[#4a3b1a] px-1.5 py-0.5"
          >[PROTOCOL]</span>
          <div class="flex items-center gap-2 text-[#a3a3a3]">
            <span id="popover-time" class="tracking-tight"></span>
            <span id="popover-rate" class="text-white font-bold bg-[#1c1c1c] border border-[#333333] px-1 py-0.2"></span>
          </div>
        </div>

        <!-- 2. 16:9 대표 썸네일 뷰포트 (Outcome SVG 도면 또는 실사 이미지) -->
        <div class="relative w-full h-[152px] bg-[#050505] border-b border-[#262626] overflow-hidden flex items-center justify-center">
          <span
            id="popover-hud-code"
            class="absolute top-1.5 left-2 z-10 text-[9px] font-mono text-[#fde68a] bg-black/85 px-1.5 py-0.5 border border-[#383838] tracking-widest uppercase"
          >FIG // TARGET OUTCOME</span>
          <img
            id="popover-thumb"
            src=""
            alt=""
            class="w-full h-full object-contain p-1.5 group-hover:scale-[1.02] transition-transform duration-150"
          />
        </div>

        <!-- 3. 프로토콜 제목 & 2줄 핵심 요약 -->
        <div class="p-3 space-y-1.5 bg-[#0a0a0a]">
          <div
            id="popover-title"
            class="text-xs sm:text-sm font-bold text-white group-hover:text-[#fde68a] leading-snug font-sans line-clamp-2 transition-colors"
          ></div>
          <p
            id="popover-summary"
            class="text-[11px] sm:text-xs text-[#cfcfcf] leading-relaxed font-sans line-clamp-2 m-0"
          ></p>
        </div>

        <!-- 4. 하단 핵심 준비물 요약 & 이동 프롬프트 -->
        <div class="bg-[#121212] border-t border-[#262626] px-3 py-1.5 flex items-center justify-between gap-2 font-mono text-[10px]">
          <span id="popover-materials" class="text-[#9ca3af] truncate flex-1"></span>
          <span
            id="popover-cta"
            data-i18n="crosslinkCta"
            class="text-[#fde68a] font-bold flex-shrink-0 tracking-wider uppercase group-hover:underline"
          >교범 보기 ↗</span>
        </div>
      </a>
    </div>
  `.trim();
}
