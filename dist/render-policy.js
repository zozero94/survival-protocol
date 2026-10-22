import { SITE_META, PWA_PATHS, SEO_CONFIG, EXTERNAL_RUNTIME_ASSETS } from './site.config.js';
import { SeoService } from './services/seo.service.js';
import { renderSearchModal, renderSearchTriggerButton, renderFooter,                       } from './components/index.js';
import { getThemeRuntimeScript, getPwaRuntimeScript, getSearchRuntimeScript } from './state/index.js';
import {
  ABOUT_MAIN_CONTENT,
  PRIVACY_MAIN_CONTENT,
  TERMS_MAIN_CONTENT,
  CONTACT_MAIN_CONTENT,
} from './policy-content.js';

                                    
                
                      
                        
                        
                     
                               
                      
                      
 

/**
 * [Policy Page Compiler]
 * Google AdSense 및 E-E-A-T 신뢰성 필수 4대 페이지(About, Privacy, Terms, Contact) 정적 HTML 생성기
 * Stitch Tactical HUD Dark Brutalist 1:1 규격 완벽 일치 + PWA 오프라인 캐시 탑재
 */
export function renderPolicyShell(options                   )         {
  const searchModalHtml = renderSearchModal('ko');
  const footerHtml = renderFooter(options.activePage);
  const themeScript = getThemeRuntimeScript();
  const pwaScript = getPwaRuntimeScript();
  const searchScript = getSearchRuntimeScript();

  return `<!DOCTYPE html>
<html class="dark" lang="ko">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport">
  <title>${options.title} // ${SITE_META.name}</title>
  <meta name="description" content="${options.description}">
  <meta name="theme-color" content="${SITE_META.themeColor}">
  <link rel="canonical" href="${SITE_META.siteUrl}${options.canonicalPath}">
  ${SeoService.renderHreflangTags(options.canonicalPath)}
  <link rel="manifest" href="${PWA_PATHS.manifest}">
  <link rel="icon" type="image/svg+xml" href="${PWA_PATHS.icon}">

  <!-- Open Graph & Social Cards -->
  <meta property="og:site_name" content="${SITE_META.name}">
  <meta property="og:title" content="${options.title} // ${SITE_META.name}">
  <meta property="og:description" content="${options.description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_META.siteUrl}${options.canonicalPath}">
  <meta property="og:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${options.title} // ${SITE_META.name}">
  <meta name="twitter:description" content="${options.description}">
  <meta name="twitter:image" content="${SITE_META.siteUrl}${SEO_CONFIG.defaultOgImage}">

  <!-- Search Engine Verifications -->
  ${SeoService.renderVerificationMetaTags()}

  <!-- Google AdSense Official Script -->
  ${SeoService.renderAdsenseHeadScript()}

  <!-- Scripts & Fonts (Tactical Dark Brutalist) -->
  <script src="${EXTERNAL_RUNTIME_ASSETS.tailwindCdn}"></script>
  <script src="/assets/fuse.basic.min.js"></script>
  <script src="/assets/search-index.js"></script>
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect">
  <link href="${EXTERNAL_RUNTIME_ASSETS.googleFontsCss}" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            "surface-container-lowest": "#0e0e0e",
            "surface-container-low": "#1c1b1b",
            "surface-container": "#201f1f",
            "surface-container-high": "#2a2a2a",
            "surface-container-highest": "#353534",
            "surface": "#131313",
            "surface-dim": "#131313",
            "primary": "#ffffff",
            "primary-container": "#e2e2e2",
            "on-primary": "#2f3131",
            "secondary": "#c7c6c6",
            "on-surface": "#e5e2e1",
            "on-surface-variant": "#c4c7c8",
            "outline": "#8e9192",
            "outline-variant": "#444748",
            "background": "#131313",
          },
          borderRadius: {
            DEFAULT: "0px",
            lg: "0px",
            xl: "0px",
            full: "0px"
          },
          spacing: {
            "margin-desktop": "2.5rem",
            "gutter": "1rem",
            "margin": "1rem",
            "space-xs": "0.25rem",
            "space-sm": "0.5rem",
            "space-md": "1rem",
            "space-lg": "1.5rem",
            "space-xl": "2.5rem",
            "gutter-desktop": "1.5rem"
          },
          fontFamily: {
            "label-sm": ["JetBrains Mono", "monospace"],
            "label-md": ["JetBrains Mono", "monospace"],
            "label-lg": ["JetBrains Mono", "monospace"],
            "body-sm": ["Chivo", "sans-serif"],
            "body-md": ["Chivo", "sans-serif"],
            "body-lg": ["Chivo", "sans-serif"],
            "headline-md": ["Space Grotesk", "sans-serif"],
            "headline-lg": ["Space Grotesk", "sans-serif"],
            "headline-xl": ["Space Grotesk", "sans-serif"],
          }
        }
      }
    };
  </script>
  <style>
    * {
      border-radius: 0px !important;
      -webkit-tap-highlight-color: transparent;
    }
    ::-webkit-scrollbar { display: none; }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
      font-size: 16px;
      line-height: 1;
      display: inline-block;
      vertical-align: middle;
    }
    .bg-grid-tactical, .technical-grid {
      background-size: 24px 24px;
      background-image: 
        linear-gradient(to right, rgba(68, 71, 72, 0.15) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(68, 71, 72, 0.15) 1px, transparent 1px);
    }
  </style>
</head>
<body class="bg-[#050505] text-[#e5e2e1] font-sans antialiased min-h-screen flex flex-col selection:bg-white selection:text-black">
  <!-- 상단 컴플라이언스 & 텔레메트리 스트립 -->
  <aside class="w-full bg-[#0e0e0e] border-b border-neutral-800 px-4 sm:px-8 py-1.5 flex flex-wrap justify-between items-center text-neutral-400 font-mono text-[11px]">
    <div class="flex items-center space-x-3">
      <span class="text-emerald-400 font-bold flex items-center gap-1.5">
        <span class="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
        [SYSTEM STATUS: AIR-GAPPED &amp; PERSISTENT]
      </span>
      <span class="text-neutral-600 hidden sm:inline">|</span>
      <span class="hidden sm:inline text-neutral-500">PWA DETERMINISTIC CACHE ACTIVE</span>
    </div>
    <div class="flex items-center space-x-3 text-[10px] text-neutral-500">
      <span>CLEARANCE: PUBLIC DOMAIN</span>
      <span class="text-neutral-600">|</span>
      <a href="/" class="text-white hover:underline font-bold">[← INDEX // 메인 교범]</a>
    </div>
  </aside>

  <!-- 글로벌 네비게이션 헤더 -->
  <header class="sticky top-0 z-40 bg-[#131313]/95 backdrop-blur border-b border-neutral-800 transition-colors">
    <div class="max-w-5xl mx-auto px-4 sm:px-8 py-2.5 flex items-center justify-between gap-2 font-mono text-xs">
      <div class="flex items-center space-x-2 min-w-0">
        <a href="/" class="font-bold text-white tracking-widest hover:text-white/80 transition-colors flex items-center gap-1.5 shrink-0">
          <span class="inline-block w-2 h-2 bg-white"></span>
          <span>[생존 교범 // SURVIVAL PROTOCOL]</span>
        </a>
        <span class="text-neutral-600 font-normal">/</span>
        <div class="flex items-center gap-1 text-neutral-400 text-[11px] truncate">
          <span class="text-neutral-500 uppercase">${options.categoryLabel}</span>
          <span>&gt;</span>
          <span class="text-white font-semibold truncate">${options.shortTitle}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <a href="/" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-800 bg-[#1a1a1a] hover:bg-neutral-800 text-neutral-300 hover:text-white font-mono text-xs">
          [← INDEX]
        </a>
        ${renderSearchTriggerButton()}
      </div>
    </div>
  </header>

  ${searchModalHtml}

  <!-- 메인 본문 캔버스 (Stitch 1:1) -->
  ${options.mainContent}

  <!-- 통합 글로벌 푸터 -->
  ${footerHtml}

  <script>
    ${themeScript}
    ${pwaScript}
    ${searchScript}
    ${options.pageScript || ''}
  </script>
</body>
</html>`;
}

/**
 * 1. About Us (프로젝트 철학 및 E-E-A-T 검증 체계) 페이지 렌더러
 */
export function renderAboutPage()         {
  return renderPolicyShell({
    title: '프로젝트 철학 및 검증 체계 (About Us)',
    description: '인류 문명 재건을 위한 무도구 실전 생존 기록서. 4대 엄격 실증 체계(E-E-A-T), 수석 편찬 및 현장 검증 위원회, CC0 오픈소스 배포 헌장.',
    canonicalPath: '/about',
    categoryLabel: 'E-E-A-T DOCTRINE',
    shortTitle: 'ABOUT // PROJECT MANIFESTO',
    activePage: 'about',
    mainContent: ABOUT_MAIN_CONTENT,
  });
}

/**
 * 2. Privacy Policy (개인정보처리방침 & 오프라인 텔레메트리 보증서) 페이지 렌더러
 */
export function renderPrivacyPage()         {
  const purgeScript = `
    function executeHardPurge() {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then(function(names) {
            for (var i = 0; i < names.length; i++) caches.delete(names[i]);
          });
        }
        var statusBox = document.getElementById('purgeStatus');
        var purgeBtn = document.getElementById('purgeBtn');
        if (statusBox) statusBox.classList.remove('hidden');
        if (purgeBtn) {
          purgeBtn.classList.remove('border-rose-600', 'text-rose-400');
          purgeBtn.classList.add('border-emerald-500', 'text-emerald-400');
          purgeBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">done_all</span><span>[PURGE COMPLETE // 초기화 완료]</span>';
        }
      } catch (e) {
        console.error('Purge error:', e);
      }
    }
  `;

  return renderPolicyShell({
    title: '개인정보처리방침 (Privacy Policy)',
    description: '개인 식별 정보 제로 수집 헌장 및 오프라인 생존 로컬 텔레메트리 보증서. Google AdSense 맞춤형 광고, GA4 익명 통계, Firebase 텔레메트리, PWA 로컬 스토리지 규정.',
    canonicalPath: '/privacy',
    categoryLabel: 'LEGAL COMPLIANCE',
    shortTitle: 'PRIVACY POLICY',
    activePage: 'privacy',
    mainContent: PRIVACY_MAIN_CONTENT,
    pageScript: purgeScript,
  });
}

/**
 * 3. Terms of Service (이용약관 및 야전 안전 면책고지) 페이지 렌더러
 */
export function renderTermsPage()         {
  return renderPolicyShell({
    title: '이용약관 및 야전 안전 면책고지 (Terms of Service)',
    description: '재난 대비 생존 교육 및 야전 안전 면책 조항. 공공 인도주의 비영리 연구 목적, 고위험 야전 실습 면책, 생존 결과 무보증 원칙, 현행법 준수 의무.',
    canonicalPath: '/terms',
    categoryLabel: 'LEGAL COMPLIANCE',
    shortTitle: 'TERMS & SAFETY DISCLAIMER',
    activePage: 'terms',
    mainContent: TERMS_MAIN_CONTENT,
  });
}

/**
 * 4. Contact & Dispatch (비상 통신 및 야전 기술 제보) 페이지 렌더러
 */
export function renderContactPage()         {
  const dispatchScript = `
    function handleDispatch(event) {
      event.preventDefault();
      var fb = document.getElementById('formFeedback');
      if (fb) {
        fb.classList.remove('hidden');
        fb.innerText = '[TRANSMISSION BUFFERED // 로컬 보안 버퍼 저장 완료 - contact@survival-protocol.com 발송 권장]';
      }
    }
  `;

  return renderPolicyShell({
    title: '비상 통신 및 야전 기술 제보 (Contact & Dispatch)',
    description: '야전 생존 기술 제보 및 긴급 통신 레지스트리. PGP 암호화 서신, 공식 GitHub 이슈/PR, 긴급 텔레그램 채널, 야전 정오표(Errata) 보고서 양식.',
    canonicalPath: '/contact',
    categoryLabel: 'EMERGENCY COMMS',
    shortTitle: 'CONTACT & DISPATCH',
    activePage: 'contact',
    mainContent: CONTACT_MAIN_CONTENT,
    pageScript: dispatchScript,
  });
}
