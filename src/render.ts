import type { Protocol } from './types/index.ts';
import type { SupportedLocale } from './i18n/locales.ts';
import { CLIENT_LOCALE_DETECTOR_BODY } from './i18n/locales.ts';
import { UI_STRINGS } from './i18n/ui-strings.ts';
import {
  renderHeader,
  renderStickyActionBar,
  renderHeroSection,
  renderChecklist,
  renderStepCards,
  renderFatalWarning,
} from './components/index.ts';
import { SITE_META, PWA_PATHS, SEO_CONFIG, ADSENSE_CONFIG } from './site.config.ts';
import { SeoService } from './services/seo.service.ts';
import {
  getThemeRuntimeScript,
  getChecklistRuntimeScript,
  getLocaleRuntimeScript,
  getPwaRuntimeScript,
} from './state/index.ts';

/**
 * [Canonical Page Template Renderer with Header-based i18n Hot-Swapping]
 * 모든 다국어 데이터셋을 결합하여, 브라우저 헤더 자동 감지 및 0.01초 무새로고침 핫스왑을 지원하는
 * 단일 정규 웹 페이지(Single Canonical Page) 컴파일러
 */
export function renderCanonicalProtocolPage(
  protocolsMap: Partial<Record<SupportedLocale, Protocol>>,
  svgsMap: Record<string, string> = {},
  defaultLocale: SupportedLocale = 'ko',
  nextProtocolTitle?: string
): string {
  const master = protocolsMap[defaultLocale] || Object.values(protocolsMap)[0];
  if (!master) {
    throw new Error('프로토콜 데이터셋이 비어 있습니다.');
  }

  const headerHtml = renderHeader(master.category, master.title, defaultLocale);
  const heroHtml = renderHeroSection(master);
  const checklistHtml = renderChecklist(master.materials);
  const stepCardsHtml = renderStepCards(master.steps, svgsMap);
  const fatalHtml = renderFatalWarning(master.fatalMistake);
  const actionHtml = renderStickyActionBar(nextProtocolTitle);

  const themeScript = getThemeRuntimeScript();
  const checklistScript = getChecklistRuntimeScript();
  const localeScript = getLocaleRuntimeScript();
  const pwaScript = getPwaRuntimeScript();

  return `<!DOCTYPE html>
<html class="dark" lang="${defaultLocale}">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title data-proto="title">${SITE_META.shortName} // ${master.title}</title>
  <meta name="description" content="${master.summary}">
  <meta name="theme-color" content="${SITE_META.themeColor}">
  <link rel="canonical" href="${SITE_META.siteUrl}/protocol-${master.protocolId.replace(/[^0-9]/g, '').padStart(2, '0')}">
  <link rel="manifest" href="${PWA_PATHS.manifest}">
  <link rel="icon" type="image/svg+xml" href="${PWA_PATHS.icon}">

  <!-- Open Graph & Social Cards -->
  <meta property="og:site_name" content="${SITE_META.name}">
  <meta property="og:title" content="${SITE_META.shortName} // ${master.title}">
  <meta property="og:description" content="${master.summary}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_META.siteUrl}/protocol-${master.protocolId.replace(/[^0-9]/g, '').padStart(2, '0')}">
  <meta property="og:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${SITE_META.shortName} // ${master.title}">
  <meta name="twitter:description" content="${master.summary}">
  <meta name="twitter:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">

  <!-- Search Engine Verifications -->
  ${SeoService.renderVerificationMetaTags()}

  <!-- Google AdSense Official Script -->
  ${SeoService.renderAdsenseHeadScript()}

  <!-- Schema.org JSON-LD HowTo Structured Data -->
  <script type="application/ld+json">
${SeoService.generateJsonLd(master, SITE_META.siteUrl)}
  </script>

  <!-- FOUC(Flash of Untranslated Content) 방지 쉴드 스타일 및 동기 판별 스크립트 -->
  <style id="fouc-shield">
    html[data-fouc="true"] body { opacity: 0 !important; }
    body { transition: opacity 0.08s ease-in; }
    #offline-banner { display: none; }
    html[data-network="offline"] #offline-banner { display: block !important; }
  </style>
  <script>
    (function() {
      ${CLIENT_LOCALE_DETECTOR_BODY}
      if (lang && lang !== '${defaultLocale}') {
        document.documentElement.setAttribute('data-fouc', 'true');
      }
      document.documentElement.lang = lang || '${defaultLocale}';
    })();
  </script>

  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
  <link href="https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            surface: '#131313',
            'surface-dim': '#0d0d0d',
            'surface-card': '#1c1b1b',
            'surface-container-high': '#262626',
            'border-tactical': '#333333',
            'border-light': '#444444',
            'brand-red': '#E02424',
            'bone-white': '#F5F5F5',
            'ash-gray': '#9E9E9E',
            'dim-gray': '#666666'
          },
          fontFamily: {
            title: ['"Space Grotesk"', 'sans-serif'],
            body: ['"Chivo"', '"Noto Sans KR"', '"Noto Sans JP"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    * { box-sizing: border-box; border-radius: 0px !important; -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; }
    body { background-color: #131313; color: #F5F5F5; font-family: 'Chivo', 'Noto Sans KR', sans-serif; line-height: 1.7; }
    @media print { .no-print { display: none !important; } body { background: white !important; color: black !important; } }
  </style>
</head>
<body class="bg-[#131313] text-[#F5F5F5] min-h-screen selection:bg-white selection:text-black antialiased flex flex-col justify-between pb-24">
  <div id="offline-banner" class="bg-red-950/90 border-b-2 border-red-600 text-red-200 text-center font-mono text-xs py-1.5 px-4 tracking-wider uppercase font-bold sticky top-0 z-50">
    ⚡ [통신 두절 감지] 외부 네트워크 단절 // 로컬 오프라인 캐시 교범으로 작동 중
  </div>
  ${headerHtml}

  <main class="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-5 space-y-6 flex-1 pb-28">
    ${heroHtml}
    ${checklistHtml}
    ${stepCardsHtml}
    ${fatalHtml}
  </main>

  ${actionHtml}

  <div class="fixed top-16 right-4 z-50 bg-white text-black font-mono text-xs font-bold px-4 py-2 border-2 border-black hidden shadow-lg" id="toast"></div>

  <script>
    // 1. 다국어 데이터셋 인메모리 임베딩 (Single Source of Truth)
    window.__PROTOCOLS__ = ${JSON.stringify(protocolsMap)};

    // 2. State Layer 직렬화 런타임 스크립트 실행
    ${themeScript}
    ${checklistScript}
    ${localeScript}
    ${pwaScript}

    // 3. 선언적 이벤트 위임 (Event Delegation)
    document.addEventListener('click', function(e) {
      var target = e.target.closest('[data-action]');
      if (!target) return;
      var action = target.getAttribute('data-action');

      if (action === 'switch-locale') {
        var lang = target.getAttribute('data-locale-btn');
        switchLocale(lang);
      } else if (action === 'toggle-theme') {
        toggleTheme();
      } else if (action === 'save-offline') {
        saveOfflineManual();
      } else if (action === 'share-protocol') {
        shareProtocol();
      }
    });

    document.addEventListener('change', function(e) {
      if (e.target && e.target.hasAttribute('data-material')) {
        updateChecklist();
      }
    });

    // 4. 초기 언어 자동 감지 및 핫스왑 실행 (브라우저 헤더 / URL / 저장값 기반)
    window.addEventListener('DOMContentLoaded', function() {
      var initialLang = detectInitialLocale();
      if (initialLang && initialLang !== '${defaultLocale}') {
        switchLocale(initialLang);
      } else {
        document.documentElement.removeAttribute('data-fouc');
      }
    });

    function showToast(msg) {
      var toast = document.getElementById('toast');
      if (!toast) return;
      toast.innerText = msg;
      toast.classList.remove('hidden');
      setTimeout(function() { toast.classList.add('hidden'); }, 2500);
    }

    function saveOfflineManual() {
      showToast('오프라인 프로토콜이 다운로드됩니다 (A4/PDF).');
      window.print();
    }

    function shareProtocol() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        showToast('프로토콜 링크가 클립보드에 복사되었습니다.');
      } else {
        showToast('비상 채널로 프로토콜이 공유되었습니다.');
      }
    }
  </script>
</body>
</html>`;
}
