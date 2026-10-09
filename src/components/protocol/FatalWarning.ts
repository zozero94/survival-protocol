import type { FatalMistake } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 치명적 실수 고대비 반전 경고 박스 컴포넌트 (Stitch High-Contrast Hazard Block)
 * 선언적 data-i18n 및 data-proto-fatal 속성 100% 탑재
 */
export function renderFatalWarning(fatal: FatalMistake): string {
  return `
<section class="border-2 border-[#E02424] bg-[#170a0a] p-5 sm:p-7 relative mb-8">
  <div class="flex items-center gap-2 mb-2.5 font-mono text-xs">
    <span id="ui-fatal-header" data-i18n="fatalTitle" class="bg-[#E02424] text-white font-bold px-1.5 py-0.5 tracking-tight uppercase">
      [치명적 경고 // FATAL ERROR]
    </span>
  </div>

  <h3 id="fatal-title" data-proto-fatal="title" class="font-title text-base sm:text-xl font-bold text-white mb-2 leading-snug">
    ${fatal.title}
  </h3>

  <div class="space-y-2.5 text-xs sm:text-sm text-[#ddd] leading-relaxed">
    <p id="fatal-desc" data-proto-fatal="description">
      ${fatal.description}
    </p>
    <div class="border-t border-[#441a1a] pt-3 font-mono text-xs text-[#bbb] flex flex-wrap items-center justify-between gap-2">
      <span id="fatal-consequence" data-proto-fatal="consequence">${fatal.consequence}</span>
      <span id="ui-fatal-rule" data-i18n="nonNegotiableRule" class="text-[#ff5555] font-bold">[타협 불가한 절대 수칙]</span>
    </div>
  </div>
</section>
  `.trim();
}
