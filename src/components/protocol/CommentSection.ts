import type { SupportedLocale } from '../../i18n/locales.ts';
import { UI_STRINGS } from '../../i18n/ui-strings.ts';
import { escapeHtml } from '../../utils/sanitize.util.ts';

/**
 * [Presentational Component]
 * 모던 다크(Linear / Vercel / Raycast 스타일) 익명 생존자 피드백 & 다국어 댓글 스레드 섹션.
 * - 단일 서피스 통합 입력창 (하단 캡슐형 닉네임 + 4자리 PIN + 화이트 필 등록 버튼)
 * - 기하학 아바타 및 1단계 대댓글 곡선형 스레드 연결선
 * - 7개국어 전체 노출 + 원클릭 인라인 자동 번역 카드 (Google GTX + MyMemory 폴백)
 * - 인쇄 시(.no-print) A4 야전 교범 가독성 보호를 위해 자동 숨김
 */
export function renderCommentSection(defaultLocale: SupportedLocale = 'ko'): string {
  const ui = UI_STRINGS[defaultLocale] || UI_STRINGS.ko;

  return `
<section id="comment-section" aria-labelledby="comment-section-heading" class="no-print pt-4 pb-8 select-none">
  <style>
    #comment-section .rounded-2xl { border-radius: 1rem !important; }
    #comment-section .rounded-xl { border-radius: 0.75rem !important; }
    #comment-section .rounded-lg { border-radius: 0.5rem !important; }
    #comment-section .rounded-md { border-radius: 0.375rem !important; }
    #comment-section .rounded-full { border-radius: 9999px !important; }
    #comment-section .rounded-bl-xl { border-bottom-left-radius: 0.75rem !important; }
    @keyframes commentFadeSlide {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: none; }
    }
    #comment-section .comment-animate-in {
      animation: commentFadeSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  </style>

  <!-- 상단 섹션 헤더 -->
  <div class="flex flex-wrap items-center justify-between gap-2 mb-4 px-1">
    <div class="flex items-center gap-2.5">
      <h2 id="comment-section-heading" data-i18n="commentSectionTitle" class="text-[15px] font-semibold tracking-tight text-zinc-100">
        ${escapeHtml(ui.commentSectionTitle)}
      </h2>
      <span id="comment-total-count" class="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-white/[0.06] text-zinc-300 border border-white/[0.08] tabular-nums">0</span>
    </div>
    <div class="flex items-center gap-2 text-xs text-zinc-400">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.07]">
        <span id="comment-status-dot" class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span data-i18n="commentFeedBadge">${escapeHtml(ui.commentFeedBadge)}</span>
      </span>
    </div>
  </div>

  <!-- 일체형 싱글 서피스 입력창 (Unified Single-Surface Composer) -->
  <div id="comment-composer-card" class="rounded-2xl bg-[#121215] border border-white/[0.08] focus-within:border-white/[0.22] focus-within:ring-4 focus-within:ring-white/[0.03] transition-all duration-200 shadow-2xl overflow-hidden mb-6">
    <!-- Honeypot Anti-Bot Trap -->
    <div class="hidden" aria-hidden="true">
      <input id="comment-hp-field" type="text" name="website_url_hp" tabindex="-1" autocomplete="off" />
    </div>

    <!-- 상단 본문 입력 영역 -->
    <div class="px-4 pt-3.5 pb-2 bg-[#16161a]/60">
      <textarea
        id="comment-input"
        rows="3"
        maxlength="300"
        data-i18n-placeholder="commentPlaceholder"
        placeholder="${escapeHtml(ui.commentPlaceholder)}"
        class="w-full bg-transparent text-[14px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed select-text"
      ></textarea>
    </div>

    <!-- 하단 캡슐 툴바 (닉네임 캡슐 + 4자리 PIN 캡슐 + 글자수 + 등록 필 버튼) -->
    <div class="px-3.5 py-2.5 bg-[#101013] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <!-- 닉네임 캡슐 -->
        <label class="group flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.07] focus-within:bg-white/[0.08] border border-white/[0.08] focus-within:border-white/[0.22] transition-all cursor-text">
          <span class="w-5 h-5 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 flex items-center justify-center text-[10px] font-bold text-white shadow-inner shrink-0" aria-hidden="true">
            <svg class="w-3 h-3 text-zinc-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </span>
          <input
            id="comment-nickname"
            type="text"
            maxlength="16"
            aria-label="${escapeHtml(ui.commentNicknameAria)}"
            class="bg-transparent text-xs font-medium text-zinc-200 focus:outline-none w-24 sm:w-28 select-text"
          />
        </label>

        <!-- 4자리 PIN 캡슐 -->
        <label class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.07] focus-within:bg-white/[0.08] border border-white/[0.08] focus-within:border-white/[0.22] transition-all cursor-text">
          <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input
            id="comment-pin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            placeholder="••••"
            aria-label="${escapeHtml(ui.commentPinAria)}"
            class="bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none w-11 tracking-widest text-center select-text"
          />
        </label>
      </div>

      <!-- 우측 글자수 카운터 & 화이트 필 등록 버튼 -->
      <div class="flex items-center gap-3 ml-auto">
        <span id="comment-char-count" class="text-[11px] font-mono text-zinc-500 tabular-nums">0/300</span>
        <button
          id="btn-submit-comment"
          type="button"
          class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 text-xs font-semibold transition-all shadow-sm cursor-pointer"
        >
          <span data-i18n="commentSubmitBtn">${escapeHtml(ui.commentSubmitBtn)}</span>
          <span class="text-zinc-500 font-normal" aria-hidden="true">↵</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 인라인 경고 / 보안 알림 배너 -->
  <div id="comment-alert-box" role="alert" class="hidden mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-200 flex items-center justify-between gap-2 comment-animate-in">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span id="comment-alert-text"></span>
    </div>
    <button id="btn-close-comment-alert" type="button" class="text-rose-400 hover:text-rose-200 text-xs px-1 cursor-pointer" aria-label="Close">✕</button>
  </div>

  <!-- 스레드 리스트 컨테이너 -->
  <div id="comment-thread-list" class="space-y-6">
    <div id="comment-empty-state" class="py-10 text-center rounded-2xl bg-[#121215]/50 border border-white/[0.05]">
      <p data-i18n="commentEmptyState" class="text-xs text-zinc-500">${escapeHtml(ui.commentEmptyState)}</p>
    </div>
  </div>
</section>
  `.trim();
}
