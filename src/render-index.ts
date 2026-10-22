import type { Protocol } from './types/index.ts';
import type { SupportedLocale } from './i18n/locales.ts';
import { CLIENT_LOCALE_DETECTOR_BODY, SUPPORTED_LOCALES } from './i18n/locales.ts';
import { SITE_META, PWA_PATHS, SEO_CONFIG, EXTERNAL_RUNTIME_ASSETS } from './site.config.ts';
import { SeoService } from './services/seo.service.ts';
import {
  renderFeedHeader,
  renderProtocolCard,
  renderPagination,
  renderSearchModal,
  renderFooter,
} from './components/index.ts';
import { SearchService, type SearchDocument } from './services/search.service.ts';
import {
  getThemeRuntimeScript,
  getPwaRuntimeScript,
  getFeedRuntimeScript,
  getSearchRuntimeScript,
  getFirebaseRuntimeScript,
} from './state/index.ts';

/**
 * [Index Page Renderer]
 * 원시 생존 교범 메인 피드 인덱스 페이지 컴파일러 (Stitch 1:1 완벽 이식 + 7개국어 0.01초 무새로고침 핫스왑)
 * 5개 단위 페이징, 7대 카테고리 필터링, PWA 오프라인 캐시를 지원한다.
 */
export function renderIndexPage(
  protocols: Protocol[],
  localesByProtocolId: Record<string, Partial<Record<SupportedLocale, Protocol>>> = {},
  searchDocsByLocale: Partial<Record<SupportedLocale, SearchDocument[]>> = {}
): string {
  const feedHeaderHtml = renderFeedHeader(protocols.length);
  const searchModalHtml = renderSearchModal('ko');
  const cardsHtml = protocols.map((p) => renderProtocolCard(p)).join('\n');
  const totalPages = Math.ceil(protocols.length / 5) || 1;
  const paginationHtml = renderPagination(1, totalPages, protocols.length);

  // 검색 전용 인메모리 슬림 인덱스 준비 (전체 프로토콜 기준)
  const resolvedSearchDocs = { ...searchDocsByLocale };
  if (!resolvedSearchDocs.ko || resolvedSearchDocs.ko.length === 0) {
    resolvedSearchDocs.ko = SearchService.buildSlimIndex(protocols, 'ko');
  }

  // 7개국어 피드 카드 경량 데이터 맵 구성
  const feedProtocolsMap: Record<
    string,
    Record<string, { title: string; summary: string; materials: string[] }>
  > = {};

  for (const lang of Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]) {
    feedProtocolsMap[lang] = {};
    for (const masterProto of protocols) {
      const pid = masterProto.protocolId;
      const localized = localesByProtocolId[pid]?.[lang] || masterProto;
      feedProtocolsMap[lang][pid] = {
        title: localized.title,
        summary: localized.summary,
        materials: (localized.materials || [])
          .slice(0, 3)
          .map((m) => m.name.replace(/\s*\(.*?\)\s*/g, '').trim()),
      };
    }
  }

  const themeScript = getThemeRuntimeScript();
  const pwaScript = getPwaRuntimeScript();
  const feedScript = getFeedRuntimeScript();
  const searchScript = getSearchRuntimeScript();
  const firebaseScript = getFirebaseRuntimeScript();

  return `<!DOCTYPE html>
<html class="dark" lang="ko">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport">
  <title data-i18n="feedHeaderTitle">${SITE_META.name} // [생존 교범 // SURVIVAL PROTOCOL]</title>
  <meta name="description" content="${SITE_META.description}">
  <meta name="theme-color" content="${SITE_META.themeColor}">
  <link rel="canonical" href="${SITE_META.siteUrl}/">
  ${SeoService.renderHreflangTags('/')}
  <link rel="manifest" href="${PWA_PATHS.manifest}">
  <link rel="icon" type="image/svg+xml" href="${PWA_PATHS.icon}">

  <!-- Open Graph & Social Cards -->
  <meta property="og:site_name" content="${SITE_META.name}">
  <meta property="og:title" content="${SITE_META.name} // SURVIVAL PROTOCOL">
  <meta property="og:description" content="${SITE_META.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_META.siteUrl}/">
  <meta property="og:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${SITE_META.name} // SURVIVAL PROTOCOL">
  <meta name="twitter:description" content="${SITE_META.description}">
  <meta name="twitter:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">

  <!-- Search Engine Verifications -->
  ${SeoService.renderVerificationMetaTags()}

  <!-- Google AdSense Official Script -->
  ${SeoService.renderAdsenseHeadScript()}

  <!-- FOUC(Flash of Untranslated Content) 방지 쉴드 및 동기 언어 감지 -->
  <style id="fouc-shield">
    html[data-fouc="true"] body { opacity: 0 !important; }
    body { transition: opacity 0.08s ease-in; }
    #offline-banner { display: none; }
    html[data-network="offline"] #offline-banner { display: block !important; }
    ::-webkit-scrollbar { display: none; }
    * { border-radius: 0px !important; -webkit-tap-highlight-color: transparent; }
  </style>
  <script>
    (function() {
      ${CLIENT_LOCALE_DETECTOR_BODY}
      if (lang && lang !== 'ko') {
        document.documentElement.setAttribute('data-fouc', 'true');
      }
      document.documentElement.lang = lang || 'ko';
    })();
  </script>

  <script src="${EXTERNAL_RUNTIME_ASSETS.tailwindCdn}"></script>
  <script src="/assets/fuse.basic.min.js"></script>
  <script src="/assets/search-index.js"></script>
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
  <link href="${EXTERNAL_RUNTIME_ASSETS.googleFontsCss}" rel="stylesheet">
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
            body: ['Chivo', '"Noto Sans KR"', '"Noto Sans JP"', 'sans-serif'],
          }
        }
      }
    }
  </script>
</head>
<body class="bg-[#131313] text-[#e5e2e1] font-body min-h-screen selection:bg-white selection:text-black flex flex-col justify-between">
  <!-- 비상 오프라인 모드 감지 배너 -->
  <div id="offline-banner" data-i18n="offlineBanner" class="bg-red-950/90 border-b border-red-600 text-red-200 text-center font-mono text-xs py-1.5 px-4 tracking-wider uppercase font-bold sticky top-0 z-50">
    ⚡ [인터넷 연결 끊김] 저장된 오프라인 화면으로 보는 중입니다
  </div>

  ${feedHeaderHtml}
  ${searchModalHtml}

  <main class="max-w-5xl mx-auto w-full px-4 sm:px-8 py-2 flex-1 pb-16">
    <!-- 피드 카드 컨테이너 (한 페이지당 5개 노출) -->
    <div id="protocol-feed-container" class="flex flex-col gap-3">
      ${cardsHtml}
    </div>

    <!-- 5개 단위 페이징 바 -->
    ${paginationHtml}
  </main>

  <!-- Stitch Tactical HUD Global Footer -->
  ${renderFooter('index')}

  <script>
    window.__FEED_PROTOCOLS__ = ${JSON.stringify(feedProtocolsMap)};
    ${themeScript}
    ${pwaScript}
    ${feedScript}
    ${searchScript}
    ${firebaseScript}
  </script>
</body>
</html>`;
}
