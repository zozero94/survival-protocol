import type { Protocol } from './types/index.ts';
import { SITE_META, PWA_PATHS } from './site.config.ts';
import {
  renderFeedHeader,
  renderProtocolCard,
  renderPagination,
} from './components/index.ts';
import {
  getThemeRuntimeScript,
  getPwaRuntimeScript,
  getFeedRuntimeScript,
} from './state/index.ts';

/**
 * [Index Page Renderer]
 * 원시 생존 교범 메인 피드 인덱스 페이지 컴파일러 (Stitch 1:1 완벽 이식)
 * 5개 단위 페이징, 7대 카테고리 필터링, PWA 오프라인 캐시를 지원한다.
 */
export function renderIndexPage(protocols: Protocol[]): string {
  const feedHeaderHtml = renderFeedHeader(protocols.length);
  const cardsHtml = protocols.map((p) => renderProtocolCard(p)).join('\n');
  const totalPages = Math.ceil(protocols.length / 5) || 1;
  const paginationHtml = renderPagination(1, totalPages, protocols.length);

  const themeScript = getThemeRuntimeScript();
  const pwaScript = getPwaRuntimeScript();
  const feedScript = getFeedRuntimeScript();

  return `<!DOCTYPE html>
<html class="dark" lang="ko">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport">
  <title>${SITE_META.name} // [생존 교범 // SURVIVAL PROTOCOL]</title>
  <meta name="description" content="${SITE_META.description}">
  <meta name="theme-color" content="${SITE_META.themeColor}">
  <link rel="manifest" href="${PWA_PATHS.manifest}">
  <link rel="icon" type="image/svg+xml" href="${PWA_PATHS.icon}">

  <style>
    #offline-banner { display: none; }
    html[data-network="offline"] #offline-banner { display: block !important; }
    ::-webkit-scrollbar { display: none; }
    * { border-radius: 0px !important; -webkit-tap-highlight-color: transparent; }
  </style>

  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
  <link href="https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,300;0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            surface: '#131313',
            'surface-low': '#1c1b1b',
            'surface-high': '#2a2a2a',
          },
          fontFamily: {
            mono: ['"JetBrains Mono"', 'monospace'],
            headline: ['"Space Grotesk"', 'sans-serif'],
            body: ['Chivo', '"Noto Sans KR"', 'sans-serif'],
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#131313] text-[#e5e2e1] font-body min-h-screen selection:bg-white selection:text-black flex flex-col justify-between">
  <!-- 비상 오프라인 모드 감지 배너 -->
  <div id="offline-banner" class="bg-red-950/90 border-b border-red-600 text-red-200 text-center font-mono text-xs py-1.5 px-4 tracking-wider uppercase font-bold sticky top-0 z-50">
    ⚡ [통신 두절 감지] 외부 네트워크 단절 // 로컬 오프라인 캐시 교범으로 작동 중
  </div>

  ${feedHeaderHtml}

  <main class="max-w-5xl mx-auto w-full px-4 sm:px-8 py-2 flex-1 pb-16">
    <!-- 피드 카드 컨테이너 (한 페이지당 5개 노출) -->
    <div id="protocol-feed-container" class="flex flex-col gap-3">
      ${cardsHtml}
    </div>

    <!-- 5개 단위 페이징 바 -->
    ${paginationHtml}
  </main>

  <!-- RECOVERY FOOTER NOTIFICATION (Stitch 1:1) -->
  <footer class="border-t border-neutral-800 bg-[#0e0e0e] text-neutral-400 py-6 px-4 sm:px-8 font-mono text-xs">
    <div class="max-w-5xl mx-auto flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 bg-white"></span>
        <p class="text-white font-bold uppercase tracking-wider">
          인간 문명 재건을 위한 무료 오픈소스 생존 기록서.
        </p>
      </div>
      <p class="text-neutral-500 text-[11px] leading-relaxed max-w-2xl">
        이 웹페이지는 한 번 방문하면 브라우저 로컬 저장소에 영구 보존되어 비행기 모드나 글로벌 통신망 두절 상황에서도 100% 작동합니다.
      </p>
    </div>
  </footer>

  <script>
    ${themeScript}
    ${pwaScript}
    ${feedScript}
  </script>
</body>
</html>`;
}
