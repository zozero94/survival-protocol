import type { ProtocolCategory } from '../../types/protocol.types.ts';

/**
 * [Presentational Component]
 * 메인 피드 인덱스 대문 헤더 (Stitch 디자인 1:1 완벽 이식)
 * 7대 카테고리 필터 칩 + 오프라인 펄스 인디케이터 + 킬러 대문 선언문
 */
export function renderFeedHeader(totalCount: number): string {
  const categories: { key: ProtocolCategory | 'ALL'; label: string }[] = [
    { key: 'ALL', label: '[전체]' },
    { key: 'WATER', label: '[식수 확보]' },
    { key: 'FIRE', label: '[불 피우기]' },
    { key: 'SHELTER', label: '[은신처]' },
    { key: 'FOOD', label: '[식량 채집]' },
    { key: 'TOOLS', label: '[원시 도구]' },
    { key: 'MEDICINE', label: '[야전 의약]' },
  ];

  const categoryTabs = categories
    .map(
      (cat, idx) => `
    <button type="button"
      data-action="filter-category"
      data-category="${cat.key}"
      class="px-3 py-1.5 font-mono text-xs uppercase tracking-wider shrink-0 transition-none ${
        idx === 0
          ? 'bg-white text-black font-bold'
          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
      }">
      ${cat.label}
    </button>
  `
    )
    .join('');

  return `
<!-- 상단 긴급 고정 헤더 레일 -->
<header class="border-b border-neutral-800 bg-black/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3">
  <div class="max-w-5xl mx-auto flex items-center justify-between">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs sm:text-sm font-black tracking-widest text-white uppercase">[생존 교범 // SURVIVAL PROTOCOL]</span>
      </div>
      <div class="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>로컬 캐시 활성화됨 (인터넷 두절 시 오프라인 열람 가능)</span>
      </div>
    </div>
    <div class="font-mono text-[11px] text-neutral-400 border border-neutral-800 px-2 py-0.5 hidden sm:block">
      CATALOG: <span class="text-white font-bold">${totalCount}</span> PROTOCOLS
    </div>
  </div>
</header>

<!-- 메인 선언문 배너 -->
<section class="max-w-5xl mx-auto w-full px-4 sm:px-8 pt-8 pb-4">
  <div class="border-b-2 border-white/20 pb-6">
    <div class="font-mono text-[11px] text-neutral-500 uppercase tracking-widest mb-2">
      MISSION STATEMENT // CIVILIZATION REBOOT
    </div>
    <h1 class="text-2xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight text-white uppercase leading-snug">
      모든 전기가 끊겼을 때,<br class="hidden sm:inline"> 오직 두 손과 이 기록만으로 살아남는다.
    </h1>
    <p class="text-neutral-400 text-xs sm:text-sm mt-3 max-w-2xl leading-relaxed">
      현대 문명이 붕괴된 후, 자연물과 두 손만으로 생명을 유지하기 위한 실전 원시 생존 기술 기록서.
      한 번 열람한 교범은 브라우저 로컬 저장소에 영구 보존되어 비행기 모드나 통신망 두절 상황에서도 100% 작동합니다.
    </p>
  </div>
</section>

<!-- 7대 퀵 카테고리 필터 칩 레일 (가로 스크롤 완비) -->
<section class="max-w-5xl mx-auto w-full px-4 sm:px-8 py-3">
  <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" id="category-filter">
    ${categoryTabs}
  </div>
</section>
  `.trim();
}
