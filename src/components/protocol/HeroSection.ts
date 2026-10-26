import type { Protocol } from '../../types/protocol.types.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';
import { highlightTechnicalTerms } from './StepCard.ts';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

/**
 * [Presentational Component]
 * 생존 프로토콜 상단 히어로 섹션 (Stitch Utilitarian Brutalist Spec Card)
 * 선언적 data-i18n 및 data-proto 속성 100% 탑재 + 등록/최종 수정 일시 배지
 */
export function renderHeroSection(protocol: Protocol): string {
  const dateStr = formatDate(protocol.createdAt);
  const dateHtml = `<span class="${dateStr ? '' : 'hidden '}border border-[#333] text-[#888] px-1.5 py-0.5 text-[11px] font-mono"><span data-i18n="createdPrefix">등록</span>: <span id="proto-date" data-proto="createdAt">${dateStr || ''}</span></span>`;

  const updatedDateStr = formatDateTime(protocol.updatedAt);
  const updatedHtml = `<div id="proto-updated-container" class="${updatedDateStr ? 'flex' : 'hidden'} items-center gap-1.5 bg-[#141414] text-[#888] border border-[#333] px-2 py-0.5 text-xs font-mono tracking-wider rounded-none">
      <svg class="w-3 h-3 text-[#777] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <span><span data-i18n="updatedPrefix">최종 수정</span>: <span id="proto-updated" data-proto="updatedAt">${updatedDateStr || ''}</span></span>
    </div>`;

  return `
<section class="border border-[#333] bg-[#1c1b1b] p-5 sm:p-7 relative overflow-hidden mb-6">
  <!-- Decorative Technical Corner Markers -->
  <div class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white"></div>
  <div class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white"></div>
  <div class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white"></div>
  <div class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white"></div>

  <!-- Hero Header Badges (Stitch Utilitarian Layout: Threat/Category/Created Date on Left, Last Modified on Right) -->
  <div class="flex items-center justify-between mb-3.5 font-mono text-xs flex-wrap gap-2">
    <div class="flex items-center gap-2 flex-wrap">
      <span id="proto-threat-badge" data-proto="threatLevelText" class="bg-white text-black font-bold px-1.5 py-0.5 tracking-tight uppercase">
        ${protocol.threatLevelText}
      </span>
      <span class="border border-[#444] text-[#ccc] px-1.5 py-0.5 text-[11px] uppercase">
        <span id="proto-hero-category" data-proto="category" data-i18n="cat_${protocol.category}">${(UI_STRINGS.ko as Record<string, string>)['cat_' + protocol.category] || protocol.category}</span>
      </span>
      ${dateHtml}
      <span class="border border-[#333] text-[#999] px-1.5 py-0.5 text-[11px] font-mono flex items-center gap-1 rounded-none">
        <svg class="w-3 h-3 text-[#777] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        <span data-i18n="viewsPrefix">열람</span>: <span id="proto-views-count" class="text-white font-bold tabular-nums min-w-[20px] inline-block text-right">-</span>
      </span>
    </div>
    ${updatedHtml}
  </div>

  <!-- Large Bold Title -->
  <h1 id="proto-main-title" data-proto="title" class="font-title text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug mb-3.5 uppercase">
    ${protocol.title}
  </h1>

  <!-- Clean Summary Paragraph with Left Accent Border -->
  <div class="border-l-2 border-white pl-3.5 py-1 text-xs sm:text-sm text-[#d1d1d1] leading-relaxed mb-4 bg-[#141414]/60">
    <p id="proto-summary" data-proto="summary">
      ${highlightTechnicalTerms(protocol.summary)}
    </p>
  </div>

  <!-- Minimal 4-column Spec Strip -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 border-t border-[#2e2e2e] font-mono text-center text-xs">
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="timeRequired" class="block text-[10px] text-[#777] uppercase tracking-tighter">소요 시간</span>
      <span id="proto-time" data-proto="timeRequired" class="text-white font-bold text-xs sm:text-sm">${protocol.timeRequired}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="successRate" class="block text-[10px] text-[#777] uppercase tracking-tighter">생존율</span>
      <span id="proto-success" data-proto="successRate" class="text-white font-bold text-xs sm:text-sm">${protocol.successRate}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="difficulty" class="block text-[10px] text-[#777] uppercase tracking-tighter">난이도</span>
      <span id="proto-difficulty" data-proto="difficulty" class="text-white font-bold text-xs sm:text-sm">${protocol.difficulty}</span>
    </div>
    <div class="bg-[#141414] p-2 border border-[#2a2a2a]">
      <span data-i18n="outputPerHour" class="block text-[10px] text-[#777] uppercase tracking-tighter">시간당 산출</span>
      <span id="proto-output" data-proto="outputPerHour" class="text-white font-bold text-xs sm:text-sm">${protocol.outputPerHour || '1.5L / h'}</span>
    </div>
  </div>
</section>
  `.trim();
}

