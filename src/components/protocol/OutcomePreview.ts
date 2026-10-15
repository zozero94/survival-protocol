import type { ProtocolOutcome } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 생존 교범 최종 완성 형태 미리보기 컴포넌트 (Stitch Target Outcome Showcase)
 * 실전 준비물 체크리스트 직전에 배치되어 제작 완성 목표를 한눈에 각인시키는 초고화질 벡터 도면 프레임
 * 선언적 data-i18n 및 data-proto-outcome 속성 100% 탑재
 */
export function renderOutcomePreview(
  outcome: ProtocolOutcome,
  svgsMap: Record<string, string> = {}
): string {
  const rawSvg = (outcome.svgFileName && svgsMap[outcome.svgFileName]) || outcome.svgCode || '';
  let labelCounter = 0;
  const processedSvg = rawSvg.replace(/<text\b([^>]*)>/gi, (_full, attrs: string) => {
    const lIdx = labelCounter++;
    const cleanAttrs = attrs
      .replace(/\s*data-svg\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*data-svg-outcome-label\s*=\s*["'][^"']*["']/gi, '');
    return `<text data-svg="outcome" data-svg-outcome-label="${lIdx}"${cleanAttrs}>`;
  });

  let visualContent = '';
  if (outcome.imageFileName) {
    visualContent = `
      <img src="/images/${outcome.imageFileName}" alt="${outcome.title}" class="max-w-2xl w-full h-auto rounded border border-[#333] shadow-lg object-cover select-none" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling){this.nextElementSibling.style.display='block';}" />
      ${processedSvg ? `<div style="display:none;" class="w-full">${processedSvg}</div>` : ''}
    `.trim();
  } else {
    visualContent = processedSvg;
  }

  return `
<section class="border border-[#333] bg-[#1c1b1b] p-5 sm:p-7 relative overflow-hidden mb-6">
  <!-- Decorative Technical Corner Markers -->
  <div class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white"></div>
  <div class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white"></div>
  <div class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white"></div>
  <div class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white"></div>

  <!-- Header Strip -->
  <div class="flex items-center justify-between pb-2.5 mb-3.5 border-b border-[#2d2d2d] font-mono text-xs">
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 bg-[#E02424]"></span>
      <h2 id="ui-outcome-title" data-i18n="outcomeTitle" class="font-bold text-white tracking-wider uppercase">
        최종 완성 형태
      </h2>
      <span class="text-[#777] hidden sm:inline">//</span>
      <span id="proto-outcome-title" data-proto-outcome="title" class="text-neutral-300 font-sans font-bold text-xs sm:text-sm truncate max-w-[200px] sm:max-w-md">
        ${outcome.title}
      </span>
    </div>
    <span class="text-[11px] text-white border border-[#444] px-1.5 py-0.5 bg-[#222] font-mono tracking-tight shrink-0" data-i18n="outcomeBadge">
      실전 완성 미리보기
    </span>
  </div>

  <!-- Technical Vector Display Frame -->
  <div class="w-full bg-[#0d0d0d] border border-[#2a2a2a] relative p-3 sm:p-6 flex flex-col items-center justify-center overflow-hidden mb-3.5">
    <!-- Subtle Blueprint Background Grid Lines -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-2xl flex items-center justify-center">
      ${visualContent}
    </div>
  </div>

  <!-- Field Inspection Standard Caption -->
  <div class="border-l-2 border-[#E02424] pl-3.5 py-2 bg-[#141414] text-xs font-sans leading-relaxed">
    <div class="font-mono text-[10px] text-[#888] uppercase tracking-wider mb-1 flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 bg-[#E02424] inline-block"></span>
      <span data-i18n="outcomeStandard">완성 검수 기준</span>
    </div>
    <p id="proto-outcome-desc" data-proto-outcome="description" class="text-xs sm:text-sm text-[#e0e0e0]">
      ${outcome.description}
    </p>
  </div>
</section>
  `.trim();
}
