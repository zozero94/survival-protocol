import type { FatalMistake } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 치명적 실수 반전 경고 박스 컴포넌트
 * 선언적 data-i18n 및 data-proto-fatal 속성 탑재
 */
export function renderFatalWarning(fatal: FatalMistake): string {
  return `
<section class="border-4 border-white dark:border-white p-6 sm:p-8 bg-black dark:bg-black text-white relative overflow-hidden mb-12 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]">
  <div class="flex items-center gap-2 mb-4">
    <span id="ui-fatal-header" data-i18n="fatalTitle" class="bg-white text-black font-mono font-black px-2 py-0.5 text-xs tracking-widest animate-pulse">
      위험 // 치명적 실수 경고
    </span>
    <span data-i18n="mustReadBeforeDrink" class="font-mono text-xs text-neutral-400">음용 전 필독</span>
  </div>
  <div class="flex flex-col md:flex-row items-start md:items-center gap-5">
    <div class="text-4xl sm:text-5xl select-none font-mono">⚠️</div>
    <div>
      <h4 id="fatal-title" data-proto-fatal="title" class="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight mb-3">
        ${fatal.title}
      </h4>
      <p id="fatal-desc" data-proto-fatal="description" class="text-neutral-200 text-sm sm:text-base leading-relaxed font-sans font-medium">
        ${fatal.description}
      </p>
    </div>
  </div>
  <div class="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between font-mono text-xs text-neutral-400 gap-2">
    <span id="fatal-consequence" data-proto-fatal="consequence">${fatal.consequence}</span>
    <span id="ui-fatal-rule" data-i18n="nonNegotiableRule" class="text-white font-bold tracking-wider">[타협 불가한 절대 수칙]</span>
  </div>
</section>
  `.trim();
}
