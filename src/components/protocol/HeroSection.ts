import type { Protocol } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 생존 프로토콜 상단 히어로 섹션 (Stitch Utilitarian Brutalist Spec Card)
 * 선언적 data-i18n 및 data-proto 속성 100% 탑재
 */
export function renderHeroSection(protocol: Protocol): string {
  return `
<section class="border border-[#333] bg-[#1c1b1b] p-5 sm:p-7 relative overflow-hidden mb-6">
  <!-- Decorative Technical Corner Markers -->
  <div class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white"></div>
  <div class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white"></div>
  <div class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white"></div>
  <div class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white"></div>

  <!-- Background Watermark -->
  <div class="absolute -right-4 -bottom-6 font-mono text-7xl font-black text-white/[0.03] pointer-events-none select-none tracking-tighter">
    ${protocol.protocolId}
  </div>

  <!-- Hero Header Badges -->
  <div class="flex flex-wrap items-center justify-between gap-2 mb-3.5 font-mono text-xs">
    <div class="flex items-center gap-2">
      <span id="proto-threat-badge" data-proto="threatLevelText" class="bg-white text-black font-bold px-1.5 py-0.5 tracking-tight uppercase">
        ${protocol.threatLevelText}
      </span>
      <span class="border border-[#444] text-[#ccc] px-1.5 py-0.5 text-[11px] uppercase">
        <span id="proto-hero-category" data-proto="category">${protocol.category}</span>
      </span>
    </div>
    <div class="text-[#888] text-[11px] flex items-center gap-1.5">
      <span data-i18n="readingTime" class="border border-[#333] px-1.5 py-0.5">열람 소요 시간: 30초</span>
      <span class="text-[10px] uppercase border border-[#333] px-1 text-[#aaa] hidden sm:inline">SEC LEVEL-A</span>
    </div>
  </div>

  <!-- Large Bold Title -->
  <h1 id="proto-main-title" data-proto="title" class="font-title text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-snug mb-2 uppercase">
    ${protocol.title}
  </h1>
  <p class="font-mono text-[11px] text-[#888] uppercase tracking-wider mb-3.5">
    FIELD SURVIVAL PROTOCOL // ${protocol.protocolId}
  </p>

  <!-- Clean Summary Paragraph with Left Accent Border -->
  <div class="border-l-2 border-white pl-3.5 py-1 text-xs sm:text-sm text-[#d1d1d1] leading-relaxed mb-4 bg-[#141414]/60">
    <p id="proto-summary" data-proto="summary">
      ${protocol.summary}
    </p>
  </div>

  <!-- Minimal 4-column Spec Strip -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 border-t border-[#2e2e2e] font-mono text-center text-xs">
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="timeRequired" class="block text-[10px] text-[#777] uppercase tracking-tighter">소요 시간</span>
      <span id="proto-time" data-proto="timeRequired" class="text-white font-bold text-xs sm:text-sm">${protocol.timeRequired}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="successRate" class="block text-[10px] text-[#777] uppercase tracking-tighter">생존율/성공률</span>
      <span id="proto-success" data-proto="successRate" class="text-white font-bold text-xs sm:text-sm">${protocol.successRate}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="difficulty" class="block text-[10px] text-[#777] uppercase tracking-tighter">기술 난이도</span>
      <span id="proto-difficulty" data-proto="difficulty" class="text-white font-bold text-xs sm:text-sm">${protocol.difficulty}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="outputPerHour" class="block text-[10px] text-[#777] uppercase tracking-tighter">시간당 산출량</span>
      <span id="proto-output" data-proto="outputPerHour" class="text-white font-bold text-xs sm:text-sm">${protocol.outputPerHour || '1.5L / h'}</span>
    </div>
  </div>
</section>
  `.trim();
}
