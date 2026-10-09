import type { Protocol } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 생존 프로토콜 상단 히어로 섹션
 * 선언적 data-i18n 및 data-proto 속성 탑재
 */
export function renderHeroSection(protocol: Protocol): string {
  return `
<section class="border-2 border-white dark:border-white p-5 sm:p-8 mb-8 bg-neutral-950 dark:bg-neutral-950 relative overflow-hidden">
  <div class="absolute -right-6 -bottom-6 font-mono text-7xl font-black text-white/5 pointer-events-none select-none tracking-tighter">
    ${protocol.protocolId}
  </div>
  <div class="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 font-mono text-xs">
    <span id="proto-threat-badge" data-proto="threatLevelText" class="bg-white text-black font-extrabold px-2.5 py-1 tracking-wider uppercase">
      ${protocol.threatLevelText}
    </span>
    <span class="border border-white/40 px-2 py-1 uppercase text-neutral-400">
      분류: <span id="proto-hero-category" data-proto="category">${protocol.category}</span>
    </span>
    <span data-i18n="readingTime" class="border border-white/40 px-2 py-1 uppercase text-neutral-400">
      열람 소요 시간: 30초
    </span>
  </div>
  <h1 id="proto-main-title" data-proto="title" class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-[1.15] mb-4 text-white">
    ${protocol.title}
  </h1>
  <p id="proto-summary" data-proto="summary" class="text-base sm:text-lg text-neutral-300 font-medium max-w-3xl leading-relaxed border-l-2 border-white pl-4 my-2">
    ${protocol.summary}
  </p>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-6 mt-6 border-t border-white/20 font-mono text-xs">
    <div>
      <div data-i18n="timeRequired" class="text-neutral-500 uppercase text-[10px]">소요 시간</div>
      <div id="proto-time" data-proto="timeRequired" class="font-bold text-white">${protocol.timeRequired}</div>
    </div>
    <div>
      <div data-i18n="successRate" class="text-neutral-500 uppercase text-[10px]">생존율/성공률</div>
      <div id="proto-success" data-proto="successRate" class="font-bold text-white">${protocol.successRate}</div>
    </div>
    <div>
      <div data-i18n="difficulty" class="text-neutral-500 uppercase text-[10px]">기술 난이도</div>
      <div id="proto-difficulty" data-proto="difficulty" class="font-bold text-white">${protocol.difficulty}</div>
    </div>
    <div>
      <div data-i18n="outputPerHour" class="text-neutral-500 uppercase text-[10px]">시간당 생산량</div>
      <div id="proto-output" data-proto="outputPerHour" class="font-bold text-white">${protocol.outputPerHour || '1.5L / h'}</div>
    </div>
  </div>
</section>
  `.trim();
}
