import type { Material } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 필수 확보 물자 체크리스트 컴포넌트
 * 선언적 data-i18n 및 data-proto-item 속성 탑재
 */
export function renderChecklist(materials: Material[]): string {
  const itemsHtml = materials
    .map(
      (m, idx) => `
    <label class="flex items-start gap-3 p-3 border border-white/30 hover:border-white cursor-pointer bg-neutral-900/50 transition-all group">
      <input type="checkbox" id="${m.id || `mat-${idx}`}" data-material="${m.id || `mat-${idx}`}" class="mt-0.5 w-4 h-4 rounded-none accent-white cursor-pointer bg-black border border-white">
      <div>
        <div id="mat-name-${idx}" data-proto-item="materials" data-proto-prop="name" data-index="${idx}" class="font-bold text-white group-hover:underline">${m.name}</div>
        <div id="mat-desc-${idx}" data-proto-item="materials" data-proto-prop="desc" data-index="${idx}" class="text-[11px] text-neutral-400 mt-0.5">${m.desc}</div>
      </div>
    </label>
  `
    )
    .join('');

  return `
<section class="border border-white dark:border-white mb-8 p-5 sm:p-6 bg-black dark:bg-black">
  <div class="flex items-center justify-between border-b border-white/30 pb-3 mb-4">
    <h2 class="font-mono text-sm sm:text-base font-bold uppercase tracking-wider flex items-center gap-2">
      <span class="bg-white text-black px-1.5 py-0.5 text-xs font-mono font-bold">REQ</span>
      <span id="ui-checklist-title" data-i18n="checklistTitle">필수 확보 물자 체크리스트 (즉시 수집할 것)</span>
    </h2>
    <span class="font-mono text-xs text-neutral-400" id="checklist-counter">0/${materials.length} 확보 완료</span>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs sm:text-sm">
    ${itemsHtml}
  </div>
  <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-neutral-400">
    <span id="ui-checklist-subtext">현장 대체 수칙: 자연 지형지물 및 주변 가용 임기응변 재료 적극 활용</span>
    <span data-i18n="fieldTested" class="text-white font-bold hidden sm:inline">[야전 검증 완료]</span>
  </div>
</section>
  `.trim();
}
