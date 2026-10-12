import type { Material } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 필수 확보 물자 체크리스트 컴포넌트 (Stitch Modular Materials Checklist)
 * 선언적 data-i18n 및 data-proto-item 속성 100% 탑재
 */
export function renderChecklist(materials: Material[]): string {
  const itemsHtml = materials
    .map(
      (m, idx) => `
    <label class="flex items-start gap-3 p-3 bg-[#1c1b1b] border border-[#2d2d2d] cursor-pointer hover:border-[#555] transition-colors select-none">
      <input type="checkbox" id="${m.id || `mat-${idx}`}" data-material="${m.id || `mat-${idx}`}" class="mt-0.5 w-4 h-4 rounded-none accent-white cursor-pointer bg-transparent border border-[#555]">
      <div class="flex-1">
        <div class="flex justify-between items-center">
          <span id="mat-name-${idx}" data-proto-item="materials" data-proto-prop="name" data-index="${idx}" class="font-bold text-white text-xs sm:text-sm">${m.name}</span>
        </div>
        <div id="mat-desc-${idx}" data-proto-item="materials" data-proto-prop="desc" data-index="${idx}" class="text-[11px] font-sans text-[#aaa] mt-0.5 leading-relaxed">${m.desc}</div>
      </div>
    </label>
  `
    )
    .join('');

  return `
<section class="border border-[#333] bg-[#171717] p-5 sm:p-6 mb-6">
  <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2d2d2d] font-mono text-xs">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 bg-white"></span>
      <h2 id="ui-checklist-title" data-i18n="checklistTitle" class="font-bold text-white tracking-wider">
        준비할 재료 체크리스트
      </h2>
    </div>
    <span class="text-[11px] text-white border border-[#444] px-1.5 py-0.5 bg-[#222]" id="checklist-counter">
      0/${materials.length} SECURED
    </span>
  </div>
  <p id="ui-checklist-desc" data-i18n="checklistDesc" class="text-[11px] text-[#888] mb-3 leading-normal font-sans">
    주변 자연에서 구할 수 있는 재료입니다. 준비된 항목을 눌러 체크하세요.
  </p>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 font-mono text-xs">
    ${itemsHtml}
  </div>
</section>
  `.trim();
}
