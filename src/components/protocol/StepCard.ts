import type { ProtocolStep } from '../../types/protocol.types.ts';

/**
 * 인라인 볼드(**...**) 및 중요 수치를 테크니컬 하이라이트 HTML로 변환합니다.
 */
export function highlightTechnicalTerms(text: string): string {
  // 1. **...** 마크다운 볼드 파싱
  return text.replace(/\*\*(.*?)\*\*/g, (_match, p1) => {
    // 숫자나 측정 단위(cm, mm, 분, 방울, kg, ℃, 리터, 컵 등)가 포함된 경우 테크니컬 옐로우(#fde68a) 하이라이트
    const isMetric = /\d+|cm|mm|kg|℃|도|분|초|방울|리터|L|ml|컵/i.test(p1);
    if (isMetric) {
      return `<strong data-proto="highlight" class="text-[#fde68a] font-mono font-bold bg-[#221f14] px-1 py-0.5 border border-[#4a3b1a] select-text">${p1}</strong>`;
    }
    return `<strong data-proto="highlight" class="text-white font-bold bg-[#262626] px-1 py-0.5 border border-[#383838] select-text">${p1}</strong>`;
  });
}

/**
 * 스텝 설명(description)을 감지하여,
 * 번호형 리스트(1. 2. 3...)인 경우 Stitch 다크 브루탈리즘 마이크로 액션 체크리스트 카드로,
 * 일반 서술형인 경우 하이라이트 문단으로 변환합니다.
 */
export function formatStepDescription(description: string, stepIdx: number): string {
  const lines = description
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const isNumbered = lines.some(l => /^(?:\d+[\.\)]|\(\d+\))\s+/.test(l));

  if (!isNumbered) {
    return `
      <p id="step-desc-${stepIdx}" data-proto-item="steps" data-proto-prop="description" data-index="${stepIdx}" class="text-sm sm:text-base text-[#d1d1d1] leading-[1.75] font-body">
        ${highlightTechnicalTerms(description)}
      </p>
    `.trim();
  }

  // 번호형 체크리스트 아이템 렌더링
  let currentNum = 1;
  const itemsHtml = lines.map((line) => {
    const match = line.match(/^(?:\d+[\.\)]|\(\d+\))\s+(.*)$/);
    const content = match ? match[1] : line;

    // "01", "02" 2자리 모노스페이스 인덱스
    const numStr = String(currentNum++).padStart(2, '0');

    // **타이틀**: 상세 내용 분리 시도
    let actionTitle = '';
    let actionDetail = content;
    const titleMatch = content.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
    if (titleMatch) {
      actionTitle = titleMatch[1];
      actionDetail = titleMatch[2];
    }

    return `
      <div class="bg-[#121212] border border-[#262626] hover:border-[#383838] p-3 sm:p-3.5 flex items-start space-x-3 transition-colors">
        <span class="text-[#fde68a] font-mono font-bold text-xs bg-[#080808] px-2 py-0.5 border border-[#383838] select-none flex-shrink-0 mt-0.5">
          ${numStr}
        </span>
        <div class="flex-1 text-xs sm:text-sm leading-relaxed space-y-0.5">
          ${actionTitle ? `<div data-proto-item="steps" data-proto-prop="actionTitle" class="text-white font-bold tracking-tight font-sans">${actionTitle}</div>` : ''}
          <div data-proto-item="steps" data-proto-prop="actionDetail" class="text-[#cfcfcf] font-sans leading-relaxed">${highlightTechnicalTerms(actionDetail)}</div>
        </div>
      </div>
    `.trim();
  }).join('\n');

  return `
    <div id="step-desc-${stepIdx}" data-proto-item="steps" data-proto-prop="description" data-index="${stepIdx}" class="space-y-2.5 font-mono">
      ${itemsHtml}
    </div>
  `.trim();
}

/**
 * [Presentational Component]
 * 단계별 도면(1:1 SVG Blueprint) 및 실행 지침 카드 컴포넌트 (Stitch Technical Blueprint Card)
 * 선언적 data-proto-item 및 data-i18n 속성 100% 탑재
 */
export function renderStepCards(steps: ProtocolStep[], svgsMap: Record<string, string> = {}): string {
  const cardsHtml = steps
    .map((step, idx) => {
      const rawSvg = (step.svgFileName && svgsMap[step.svgFileName]) || step.svgCode || '';
      let labelCounter = 0;
      const processedSvg = rawSvg.replace(/<text\b([^>]*)>/gi, (_full, attrs: string) => {
        const lIdx = labelCounter++;
        const cleanAttrs = attrs
          .replace(/\s*data-svg-step\s*=\s*["'][^"']*["']/gi, '')
          .replace(/\s*data-svg-label\s*=\s*["'][^"']*["']/gi, '');
        return `<text data-svg-step="${idx}" data-svg-label="${lIdx}"${cleanAttrs}>`;
      });

      let visualContent = '';
      if (step.imageFileName) {
        visualContent = `
          <img src="/images/${step.imageFileName}" alt="STEP ${step.stepNumber}: ${step.title}" class="max-w-[420px] w-full h-auto rounded border border-[#333] shadow-md object-cover select-none" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling){this.nextElementSibling.style.display='block';}" />
          ${processedSvg ? `<div style="display:none;" class="w-full flex items-center justify-center">${processedSvg}</div>` : ''}
        `.trim();
      } else {
        visualContent = processedSvg;
      }

      // Stitch 자문 기반: TECHNICAL DEEP DIVE // FIELD PRINCIPLE 추가 정보란
      let deepDiveHtml = '';
      if (step.deepDive) {
        deepDiveHtml = `
        <!-- TECHNICAL DEEP DIVE // FIELD PRINCIPLE (Stitch Spec) -->
        <section class="border border-[#383838] bg-[#0a0a0a] p-3.5 sm:p-4 font-mono text-xs mt-3 relative">
          <div class="flex items-center justify-between border-b border-[#262626] pb-2 mb-2.5">
            <div class="flex items-center space-x-2">
              <span class="w-1.5 h-3.5 bg-[#fde68a] inline-block"></span>
              <span class="font-bold text-[#fde68a] tracking-wider text-[11px] sm:text-xs uppercase">
                TECHNICAL DEEP DIVE // FIELD PRINCIPLE
              </span>
            </div>
            <span data-proto-item="steps" data-proto-prop="deepDiveBadge" data-index="${idx}" class="text-[10px] text-[#888] bg-[#141414] px-1.5 py-0.5 border border-[#262626]">
              ${step.deepDive.badge || 'FIELD SCIENCE'}
            </span>
          </div>
          <div class="space-y-1 font-sans">
            <div data-proto-item="steps" data-proto-prop="deepDiveTitle" data-index="${idx}" class="text-white font-bold text-xs sm:text-sm mb-1">${step.deepDive.title}</div>
            <p data-proto-item="steps" data-proto-prop="deepDiveText" data-index="${idx}" class="text-[#a3a3a3] text-xs leading-relaxed font-sans">${highlightTechnicalTerms(step.deepDive.text)}</p>
          </div>
        </section>
        `.trim();
      }

      return `
    <article class="border border-[#333] bg-[#1c1b1b] overflow-hidden mb-6">
      <!-- 1. Technical Vector Blueprint / Visual Frame (FIG 01~03) -->
      <div class="bg-[#111111] border-b border-[#2d2d2d] p-4 text-white">
        <div class="flex items-center justify-between font-mono text-[10px] text-[#888] mb-2">
          <span class="border border-[#444] px-1.5 py-0.5 text-white bg-black">
            <span data-i18n="figurePrefix">FIG</span>. ${step.stepNumber} // ${step.imageFileName ? 'FIELD VISUAL' : 'BLUEPRINT SCHEMATIC'}
          </span>
          <span class="tracking-wider text-[10px] text-[#777]">SCALE 1:1 FIELD GUIDE</span>
        </div>
        <div class="w-full flex items-center justify-center py-3 min-h-[190px] [&>svg]:max-w-[420px] [&>svg]:w-full [&>svg]:h-auto">
          ${visualContent}
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
        
        ${formatStepDescription(step.description, idx)}

        <!-- Monospace Field Note Callout -->
        <div class="border border-[#383838] bg-[#141414] p-3 sm:p-3.5 font-mono text-xs sm:text-sm text-[#bbb] flex gap-2.5 items-start mt-2">
          <span class="text-white font-bold select-none">[NOTE]</span>
          <div id="step-note-${idx}" data-proto-item="steps" data-proto-prop="actionNote" data-index="${idx}" class="flex-1 leading-relaxed">
            ${highlightTechnicalTerms(step.actionNote)}
          </div>
        </div>

        ${deepDiveHtml}
      </div>
    </article>
      `.trim();
    })
    .join('\n');

  return `
<section class="mb-6 space-y-4">
  <div class="flex items-center justify-between border-b border-[#333] pb-2 font-mono text-xs">
    <span id="ui-procedure-title" data-i18n="procedureTitle" class="text-white font-bold tracking-wider">// 순서대로 따라 하기</span>
    <span class="text-[11px] text-[#888]">1 ~ ${steps.length} <span data-i18n="stepsFlow">단계 순서</span></span>
  </div>
  <div>
    ${cardsHtml}
  </div>
</section>
  `.trim();
}
