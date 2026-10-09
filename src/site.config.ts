/**
 * [Site Config]
 * 사이트 메타데이터, PWA 경로, 외부 런타임 자원, SEO 및 애드센스 설정의 단일 진실 공급원(SSOT).
 */

export const SITE_META = {
  name: '인류 멸망 후 원시 생존 교범',
  shortName: '생존 교범',
  description: '현대 도구 없이 자연물과 두 손만으로 살아남는 원시 생존 기술 기록서',
  lang: 'ko',
  themeColor: '#050505',
  backgroundColor: '#050505',
  siteUrl: (process.env.SITE_URL || 'https://survival-protocol-kappa.vercel.app').replace(/\/$/, ''),
} as const;

export const PWA_PATHS = {
  serviceWorker: '/sw.js',
  manifest: '/manifest.webmanifest',
  icon: '/icons/icon.svg',
} as const;

/**
 * [Google AdSense & Monetization Settings]
 */
export const ADSENSE_CONFIG = {
  clientId: process.env.ADSENSE_CLIENT_ID || '', // 예: ca-pub-1234567890123456
  adsTxt: process.env.ADSENSE_ADS_TXT || 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0',
} as const;

/**
 * [Search Engine Optimization & Webmaster Tools]
 */
export const SEO_CONFIG = {
  googleSiteVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  naverSiteVerification: process.env.NAVER_SITE_VERIFICATION || '',
  defaultOgImage: '/icons/icon.svg',
} as const;

/**
 * 페이지가 런타임에 불러오는 외부(cross-origin) 자원.
 * 오프라인에서 스타일이 깨지지 않도록 서비스 워커 설치 단계에서 함께 저장한다.
 */
export const EXTERNAL_RUNTIME_ASSETS = {
  tailwindCdn: 'https://cdn.tailwindcss.com',
  googleFontsCss:
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Noto+Sans+KR:wght@400;500;700;900&family=Public+Sans:wght@400;600;800&family=Noto+Sans+JP:wght@400;700&display=swap',
} as const;
