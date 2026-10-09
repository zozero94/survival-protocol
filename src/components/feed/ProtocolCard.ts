import type { Protocol, ProtocolCategory } from '../../types/protocol.types.ts';

const CATEGORY_LABELS: Record<ProtocolCategory, string> = {
  WATER: '[식수 확보]',
  FIRE: '[불 피우기]',
  SHELTER: '[은신처]',
  FOOD: '[식량 채집]',
  TOOLS: '[원시 도구]',
  MEDICINE: '[야전 의약]',
};

const DEFAULT_SVGS: Record<ProtocolCategory, string> = {
  WATER: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6H34M16 6L18 20L21 34L24 38L27 34L30 20L32 6" stroke-width="1.8"></path><path d="M17.5 11H30.5M19 15H29M20 19H28" stroke-width="1.2" stroke-dasharray="1 2" opacity="0.7"></path><circle cx="21" cy="13" r="1" fill="currentColor"></circle><circle cx="24" cy="14" r="1.2" fill="currentColor"></circle><circle cx="27" cy="12.5" r="0.9" fill="currentColor"></circle><circle cx="23" cy="17" r="1" fill="currentColor"></circle><line x1="18.2" y1="20" x2="29.8" y2="20" stroke-width="1.5"></line><path d="M19.5 24H28.5M20 27H28M20.8 30H27.2" stroke-width="1" opacity="0.8"></path><line x1="21" y1="34" x2="27" y2="34" stroke-width="1.5"></line><circle cx="24" cy="42" r="1.5" fill="currentColor"></circle><path d="M24 40V38" stroke-width="1.5"></path></svg>`,
  FIRE: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12C14 8 28 8 38 18" stroke-width="2.2"></path><path d="M9 12L37 18" stroke-width="1.2" stroke-dasharray="3 1.5"></path><rect x="22" y="8" width="6" height="28" rx="1" stroke-width="1.6"></rect><line x1="25" y1="8" x2="25" y2="36" stroke-width="1" opacity="0.6"></line><path d="M19 6H31V9H19Z" stroke-width="1.5"></path><rect x="12" y="36" width="26" height="6" stroke-width="1.8"></rect><path d="M23 36L25 39L27 36" stroke-width="1.5"></path></svg>`,
  SHELTER: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6L6 38H42L24 6Z" stroke-width="2"></path><line x1="24" y1="6" x2="24" y2="38" stroke-width="1.5"></line><line x1="15" y1="22" x2="33" y2="22" stroke-width="1.2"></line><path d="M18 38V30H30V38" stroke-width="1.5"></path></svg>`,
  FOOD: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="24" cy="18" rx="14" ry="4" stroke-width="1.8"></ellipse><path d="M10 18C10 27 15 33 24 33C33 33 38 27 38 18" stroke-width="2"></path><ellipse cx="11" cy="38" rx="5" ry="3" stroke-width="1.6"></ellipse><ellipse cx="24" cy="40" rx="6" ry="3" stroke-width="1.6"></ellipse><ellipse cx="37" cy="38" rx="5" ry="3" stroke-width="1.6"></ellipse></svg>`,
  TOOLS: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 38L12 32C15 29 17 30 20 27L26 21C29 18 31 19 34 16L42 8" stroke-width="2.2"></path><path d="M9 41L15 35C18 32 20 33 23 30L29 24C32 21 34 22 37 19L45 11" stroke-width="2.2"></path><line x1="9" y1="35" x2="12" y2="38" stroke-width="1.2"></line><line x1="16" y1="28" x2="19" y2="31" stroke-width="1.2"></line><line x1="23" y1="20" x2="26" y2="23" stroke-width="1.2"></line></svg>`,
  MEDICINE: `<svg class="shrink-0 mt-0.5 text-white" width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 38L18 26L30 14" stroke-width="2.2"></path><path d="M23 27C21 31 21 35 25 39C29 39 30 35 27 31C25 28 24 26 23 27Z" stroke-width="1.6"></path><rect x="30" y="26" width="14" height="14" stroke-width="1.2" stroke-dasharray="2 1.5"></rect><path d="M37 29V37M33 33H41" stroke-width="2"></path></svg>`,
};

/**
 * [Presentational Component]
 * 단일 프로토콜 피드 카드 컴포넌트 (Stitch 디자인 1:1 완벽 이식)
 * 40×40 정밀 인라인 벡터 도면 + 헤더 레일 + 재료 칩 + 직관적 제목
 */
export function renderProtocolCard(protocol: Protocol): string {
  const categoryLabel = CATEGORY_LABELS[protocol.category] || `[${protocol.category}]`;
  const iconSvg = protocol.iconSvg || DEFAULT_SVGS[protocol.category] || DEFAULT_SVGS.WATER;

  const threatBadge =
    protocol.threatLevel === 'CRITICAL'
      ? '<span class="bg-red-950/80 border border-red-600 text-red-400 px-2 py-0.5 uppercase tracking-widest font-bold">[치명적]</span>'
      : protocol.threatLevel === 'HIGH'
      ? '<span class="bg-amber-950/80 border border-amber-600 text-amber-400 px-2 py-0.5 uppercase tracking-widest font-bold">[필수]</span>'
      : '<span class="bg-neutral-900 border border-neutral-700 text-neutral-300 px-2 py-0.5 uppercase tracking-widest font-bold">[기초 기술]</span>';

  const materialsHtml = (protocol.materials || [])
    .slice(0, 3)
    .map(
      (m) =>
        `<span class="font-mono text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5">[${m.name.split(' ')[0]}]</span>`
    )
    .join('');

  const num = protocol.protocolId.replace(/[^0-9]/g, '').padStart(2, '0') || '01';
  const detailLink = `/protocol-${num}`;

  return `
<article class="bg-[#1c1b1b] border border-neutral-800 hover:border-neutral-500 p-4 sm:p-5 flex flex-col gap-3 transition-colors group cursor-pointer" data-protocol-card="${protocol.protocolId}" data-protocol-href="${detailLink}" data-category="${protocol.category}">
  <!-- 상단 헤더 레일 -->
  <div class="flex items-center justify-between font-mono text-xs pb-1 border-b border-neutral-800/80">
    <div class="flex items-center gap-2">
      <span class="text-neutral-400 font-bold">${categoryLabel}</span>
      <span class="text-neutral-600">/</span>
      <span class="text-neutral-500">${protocol.protocolId}</span>
    </div>
    ${threatBadge}
  </div>

  <!-- 메인 본문: 인라인 정밀 SVG 도면 + 행동 중심 대제목 -->
  <div class="flex gap-3 sm:gap-4 items-start py-1">
    <div class="shrink-0 p-1.5 bg-black border border-neutral-800">
      ${iconSvg}
    </div>
    <div class="flex flex-col flex-1 min-w-0">
      <h2 class="text-base sm:text-lg md:text-xl font-bold font-mono text-white group-hover:underline underline-offset-4 tracking-tight leading-snug">
        <a href="${detailLink}" class="block focus:outline-none">
          ${protocol.title}
        </a>
      </h2>
      <p class="text-neutral-400 text-xs sm:text-sm mt-1.5 line-clamp-2 leading-relaxed">
        ${protocol.summary}
      </p>
    </div>
  </div>

  <!-- 하단 메타데이터 스탬프 & 바로가기 -->
  <div class="pt-2 border-t border-neutral-800 flex items-center justify-between font-mono text-xs">
    <div class="flex items-center gap-1.5 flex-wrap">
      ${materialsHtml}
    </div>
    <a href="${detailLink}" class="text-white font-bold group-hover:translate-x-1 transition-transform uppercase tracking-wider shrink-0 flex items-center gap-1">
      [교범 열람 →]
    </a>
  </div>
</article>
  `.trim();
}
