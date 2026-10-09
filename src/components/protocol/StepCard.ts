import type { ProtocolStep } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 단계별 도면(1:1 SVG Blueprint) 및 실행 지침 카드 컴포넌트 (Stitch Technical Blueprint Card)
 * 선언적 data-proto-item 및 data-i18n 속성 100% 탑재
 */
export function renderStepCards(steps: ProtocolStep[], svgsMap: Record<string, string> = {}): string {
  const cardsHtml = steps
    .map((step, idx) => {
      const svgContent = svgsMap[step.svgFileName] || step.svgCode || '';
      return `
    <article class="border border-[#333] bg-[#1c1b1b] overflow-hidden mb-6">
      <!-- 1. Technical Vector Blueprint Frame (FIG 01~03) -->
      <div class="bg-[#111111] border-b border-[#2d2d2d] p-4 text-white">
        <div class="flex items-center justify-between font-mono text-[10px] text-[#888] mb-2">
          <span class="border border-[#444] px-1.5 py-0.5 text-white bg-black">
            <span data-i18n="figurePrefix">FIG</span>. ${step.stepNumber} // BLUEPRINT SCHEMATIC
          </span>
          <span class="tracking-wider text-[10px] text-[#777]">SCALE 1:1 FIELD GUIDE</span>
        </div>
        <div class="w-full flex items-center justify-center py-3 min-h-[190px] [&>svg]:max-w-[420px] [&>svg]:w-full [&>svg]:h-auto">
          ${svgContent}
        </div>
      </div>

      <!-- 2. Step Instructions & Field Callout -->
      <div class="p-5 sm:p-6 space-y-3">
        <div class="flex items-center gap-2.5">
          <span class="bg-white text-black font-mono font-bold text-xs px-2 py-0.5 tracking-wider">STEP ${step.stepNumber}</span>
          <h3 id="step-title-${idx}" data-proto-item="steps" data-proto-prop="title" data-index="${idx}" class="font-title font-bold text-base sm:text-xl text-white tracking-tight">
            ${step.title}
          </h3>
        </div>
        
        <p id="step-desc-${idx}" data-proto-item="steps" data-proto-prop="description" data-index="${idx}" class="text-sm sm:text-base text-[#d1d1d1] leading-[1.75] font-body">
          ${step.description}
        </p>

        <!-- Monospace Field Note Callout -->
        <div class="border border-[#383838] bg-[#141414] p-3 sm:p-3.5 font-mono text-xs sm:text-sm text-[#bbb] flex gap-2.5 items-start mt-2">
          <span class="text-white font-bold select-none">[NOTE]</span>
          <div id="step-note-${idx}" data-proto-item="steps" data-proto-prop="actionNote" data-index="${idx}" class="flex-1 leading-relaxed">
            ${step.actionNote}
          </div>
        </div>
      </div>
    </article>
      `.trim();
    })
    .join('\n');

  return `
<section class="mb-6 space-y-4">
  <div class="flex items-center justify-between border-b border-[#333] pb-2 font-mono text-xs">
    <span id="ui-procedure-title" data-i18n="procedureTitle" class="text-white font-bold tracking-wider">// 실행 절차 표준 (PROCEDURE)</span>
    <span class="text-[11px] text-[#888]">1 ~ ${steps.length} <span data-i18n="stepsFlow">단계 진행</span></span>
  </div>
  <div>
    ${cardsHtml}
  </div>
</section>
  `.trim();
}
