/**
 * [Presentational Component]
 * 5개 단위 페이징(Pagination) 네비게이션 컴포넌트 (Stitch 디자인 1:1 완벽 이식)
 * [←] [01] [02] [→] 버튼 매트릭스 + "기록 1 - 5 / 총 N건" 메타데이터 레이블
 */
export function renderPagination(currentPage: number, totalPages: number, totalItems: number = 6): string {
  if (totalPages <= 1) {
    return `
<section id="pagination-nav" class="pt-6 pb-2 flex items-center justify-between border-t border-neutral-800 font-mono text-xs">
  <div class="flex items-center gap-1">
    <button type="button" class="px-3 py-1.5 bg-white text-black font-bold border border-white">01</button>
  </div>
  <div id="pagination-summary-label" class="text-neutral-500">
    기록 1 - ${totalItems} / 총 ${totalItems}건
  </div>
</section>
    `.trim();
  }

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const pageButtons: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    const isCurrent = i === currentPage;
    const padNum = String(i).padStart(2, '0');
    pageButtons.push(`
      <button type="button"
        data-action="goto-page"
        data-page-target="${i}"
        class="px-3 py-1.5 font-mono text-xs transition-none ${
          isCurrent
            ? 'bg-white text-black font-bold border border-white'
            : 'bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800'
        }">
        ${padNum}
      </button>
    `);
  }

  const startIdx = (currentPage - 1) * 5 + 1;
  const endIdx = Math.min(currentPage * 5, totalItems);

  return `
<section id="pagination-nav" class="pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800 font-mono text-xs">
  <div class="flex items-center gap-1" id="pagination-buttons-bar">
    <!-- 이전 버튼 -->
    <button type="button"
      data-action="goto-page"
      data-page-target="${currentPage - 1}"
      ${prevDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 font-mono text-xs transition-none ${
        prevDisabled
          ? 'bg-black text-neutral-700 border border-neutral-900 cursor-not-allowed'
          : 'bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800'
      }">
      [←]
    </button>

    <!-- 페이지 번호 버튼 목록 -->
    <div id="pagination-pages-container" class="flex items-center gap-1">
      ${pageButtons.join('')}
    </div>

    <!-- 다음 버튼 -->
    <button type="button"
      data-action="goto-page"
      data-page-target="${currentPage + 1}"
      ${nextDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 font-mono text-xs transition-none ${
        nextDisabled
          ? 'bg-black text-neutral-700 border border-neutral-900 cursor-not-allowed'
          : 'bg-[#1c1b1b] text-neutral-400 hover:text-white border border-neutral-800'
      }">
      [→]
    </button>
  </div>

  <div id="pagination-summary-label" class="text-neutral-500 font-mono text-xs">
    기록 <span id="pagination-range-label" class="text-neutral-300 font-bold">${startIdx} - ${endIdx}</span> / 총 <span id="pagination-total-items-label" class="text-neutral-300 font-bold">${totalItems}</span>건
  </div>
</section>
  `.trim();
}
