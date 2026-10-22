import { PROTOCOL_FAQS,                      } from '../../content/protocol-faqs.js';

/**
 * [Presentational Component]
 * 야전 실전 트러블슈팅 FAQ 접이식 아코디언 컴포넌트 (Stitch Tactical HUD 규격 1:1 완벽 이식)
 * 기본적으로 접혀있는(<details> بدون open) 상태로 배치되어 인간 사용자의 가독성과 직관성을 100% 보존하며,
 * 검색엔진 및 구글 애드센스 봇에게는 고품질 Q&A 및 Schema.org FAQPage 구조화 데이터로 공급된다.
 */
export function renderFaqSection(protocolId        , customFaqs                    )         {
  const faqs = customFaqs && customFaqs.length > 0 ? customFaqs : PROTOCOL_FAQS[protocolId] || [];
  if (faqs.length === 0) return '';

  const cardsHtml = faqs
    .map((item, idx) => {
      const qNum = String(idx + 1).padStart(2, '0');
      return `
    <details class="group border border-[#262626] bg-[#141414] hover:border-[#404040] transition-colors">
      <summary class="flex justify-between items-center p-3 sm:p-3.5 cursor-pointer select-none bg-[#111111] hover:bg-[#1a1a1a] transition-colors list-none">
        <div class="flex items-center gap-2.5 min-w-0 pr-2">
          <span class="font-mono text-[11px] text-[#050505] bg-[#fde68a] px-1.5 py-0.5 font-bold shrink-0">
            [Q${qNum}]
          </span>
          <span data-proto="faq" class="font-mono text-xs sm:text-sm font-semibold text-white truncate group-open:whitespace-normal">
            ${item.question}
          </span>
        </div>
        <div class="font-mono text-[10px] text-neutral-400 border border-[#333] px-2 py-0.5 bg-[#080808] shrink-0 flex items-center gap-1">
          <span class="group-open:hidden text-[#fde68a]" data-i18n="faqExpandText">[ + 펼치기 ]</span>
          <span class="hidden group-open:inline text-neutral-300" data-i18n="faqCollapseText">[ - 접기 ]</span>
        </div>
      </summary>
      <div class="p-3.5 sm:p-4 bg-[#0a0a0a] border-t border-[#262626] space-y-2.5 text-xs sm:text-sm leading-relaxed">
        <div class="p-2.5 bg-[#121212] border border-[#262626] font-mono text-[11px] flex items-start gap-2">
          <span class="text-[#f59e0b] font-bold shrink-0" data-i18n="faqCauseLabel">[CAUSE DIAGNOSTIC]:</span>
          <span data-proto="faq" class="text-neutral-300 leading-snug">${item.causeDiagnostic}</span>
        </div>
        <div class="bg-[#121212] border-l-2 border-[#fde68a] border-t border-r border-b border-[#262626] p-3 text-neutral-200">
          <div class="font-mono text-[10px] text-[#fde68a] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span data-i18n="faqResolutionLabel">TACTICAL RESOLUTION // 야전 즉각 조치</span>
          </div>
          <p data-proto="faq" class="text-neutral-200 leading-relaxed font-sans text-xs sm:text-sm">
            ${item.resolution}
          </p>
        </div>
      </div>
    </details>
      `.trim();
    })
    .join('\n');

  return `
<section aria-label="Field Troubleshooting Accordion Nodes" class="border border-[#262626] bg-[#0d0d0d] p-4 sm:p-6 mb-8 space-y-4">
  <!-- 상단 헤더 레일 -->
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-3">
    <div class="flex items-center gap-2 font-mono text-xs text-[#fde68a] font-bold">
      <span class="inline-block w-2 h-2 bg-[#fde68a]"></span>
      <span data-i18n="faqSectionTitle">// 05 FIELD TROUBLESHOOTING &amp; FAQ</span>
    </div>
    <div class="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
      <span class="border border-[#333] bg-[#141414] px-1.5 py-0.5" data-i18n="faqBadgeSchema">[SCHEMA.ORG FAQPAGE]</span>
      <span class="border border-[#333] bg-[#141414] px-1.5 py-0.5 text-emerald-400 font-bold" data-i18n="faqBadgeStatus">[RESOLUTIONS READY]</span>
    </div>
  </div>

  <div class="space-y-1">
    <h3 class="text-sm sm:text-base font-bold font-mono text-white" data-i18n="faqHeadline">
      야전 돌발 변수 대처 및 실패 방지 실전 질의응답
    </h3>
    <p class="text-neutral-400 text-xs leading-relaxed" data-i18n="faqSubtext">
      비가 오거나 바람이 강할 때, 여과수가 뿌옇거나 부품이 헐거워질 때 즉각 시도할 수 있는 야전 긴급 대응 요령입니다.
    </p>
  </div>

  <!-- 아코디언 목록 (기본 접힘 상태) -->
  <div class="space-y-2.5 pt-1">
    ${cardsHtml}
  </div>
</section>
  `.trim();
}
