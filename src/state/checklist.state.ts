/**
 * [State / ViewModel Layer]
 * 체크리스트 상태 관리 및 클라이언트 런타임 스크립트 생성기 (Single Source of Truth)
 * 다국어 UI_STRINGS 동적 연동
 */
export interface ChecklistState {
  totalCount: number;
  checkedIds: Set<string>;
}

export function createChecklistState(initialIds: string[] = []): ChecklistState {
  return {
    totalCount: initialIds.length,
    checkedIds: new Set<string>(),
  };
}

export function getChecklistRuntimeScript(): string {
  return `
    function updateChecklist() {
      var checkboxes = document.querySelectorAll('input[type="checkbox"][data-material]');
      var checked = 0;
      checkboxes.forEach(function(b) { if (b.checked) checked++; });
      var counter = document.getElementById('checklist-counter');
      if (counter) {
        var lang = document.documentElement.lang || 'ko';
        var ui = (window.__UI_STRINGS__ && window.__UI_STRINGS__[lang]) || {};
        var securedLabel = ui.itemsSecured || '확보 완료';
        counter.innerText = checked + '/' + checkboxes.length + ' ' + securedLabel;
        if (checked === checkboxes.length && checkboxes.length > 0) {
          counter.classList.add('text-emerald-400', 'font-bold');
        } else {
          counter.classList.remove('text-emerald-400', 'font-bold');
        }
      }
    }
  `.trim();
}
