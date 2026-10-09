import type { ProtocolStep } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 단계별 도면(1:1 SVG) 및 실행 지침 카드 컴포넌트
 * 선언적 data-proto-item 및 data-i18n 속성 탑재
 */
export function renderStepCards(steps: ProtocolStep[], svgsMap: Record<string, string> = {}): string {
  const cardsHtml = steps
    .map((step, idx) => {
      const svgContent = svgsMap[step.svgFileName] || step.svgCode || '';
      return `
    <div class="border-2 border-white dark:border-white bg-black dark:bg-black p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div class="md:col-span-4 flex flex-col items-center justify-center border border-white/30 bg-neutral-950 p-4 aspect-square">
        ${svgContent}
        <span class="font-mono text-[10px] text-neutral-400 mt-2 uppercase tracking-widest text-center"><span data-i18n="figurePrefix">그림</span>: ${step.stepNumber}</span>
      </div>
      <div class="md:col-span-8 flex flex-col justify-center">
        <div class="flex items-center gap-3 mb-2">
          <span class="font-mono font-black text-3xl sm:text-4xl text-white">${step.stepNumber}</span>
          <div class="h-4 w-px bg-white/40"></div>
          <h3 id="step-title-${idx}" data-proto-item="steps" data-proto-prop="title" data-index="${idx}" class="text-lg sm:text-xl font-bold uppercase tracking-tight text-white">${step.title}</h3>
        </div>
        <p id="step-desc-${idx}" data-proto-item="steps" data-proto-prop="description" data-index="${idx}" class="text-neutral-300 text-sm sm:text-base leading-relaxed mb-3">
          ${step.description}
        </p>
        <p id="step-note-${idx}" data-proto-item="steps" data-proto-prop="actionNote" data-index="${idx}" class="text-neutral-400 text-xs sm:text-sm font-mono leading-relaxed bg-neutral-900/60 p-3 border-l-2 border-white">
          ${step.actionNote}
        </p>
      </div>
    </div>
      `.trim();
    })
    .join('\n');

  return `
<div class="mb-8">
  <div class="flex items-center justify-between mb-4">
    <h2 class="font-mono text-sm sm:text-base font-bold uppercase tracking-wider text-white">
      <span id="ui-procedure-title" data-i18n="procedureTitle">실행 절차 // 야전 단계별 행동 지침</span>
    </h2>
    <span class="font-mono text-xs text-neutral-400">1 ~ ${steps.length} <span data-i18n="stepsFlow">단계 진행</span></span>
  </div>
  <div class="space-y-6">
    ${cardsHtml}
  </div>
</div>
  `.trim();
}
