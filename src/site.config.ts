/**
 * [Site Config]
 * 사이트 메타데이터, PWA 경로, 외부 런타임 자원, SEO 및 애드센스 설정의 단일 진실 공급원(SSOT).
 */

export const SITE_META = {
  name: '포스트 아포칼립스에서 살아남기',
  shortName: '생존 교범',
  description: '문명이 멈춘 세상, 버려진 도시 물품과 자연물만으로 살아남는 실전 생존 기술 기록서',
  lang: 'ko',
  themeColor: '#050505',
  backgroundColor: '#050505',
  siteUrl: (process.env.SITE_URL || 'https://survival-protocol.com').replace(/\/$/, ''),
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
  clientId: process.env.ADSENSE_CLIENT_ID || 'ca-pub-4169469417741632',
  adsTxt: process.env.ADSENSE_ADS_TXT || 'google.com, pub-4169469417741632, DIRECT, f08c47fec0942fa0',
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
 * [Firebase & Realtime Telemetry Settings]
 * Realtime Database (고빈도 조회수/좋아요 영구 무료 운용) 및 GA4 방문자 분석 설정
 */
export const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBcRHzAgxRGSoZ_8yxgNRnKrJwUzgHjmxs',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'zozero94-462fc.firebaseapp.com',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://zozero94-462fc-default-rtdb.firebaseio.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'zozero94-462fc',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'zozero94-462fc.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '813038880669',
  appId: process.env.FIREBASE_APP_ID || '1:813038880669:web:c62941cc79cae32be7d174',
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-FJLCKRXCT1',
  disabled: process.env.FIREBASE_DISABLED === 'true',
} as const;

/**
 * 페이지가 런타임에 불러오는 외부(cross-origin) 자원.
 * 오프라인에서 스타일이 깨지지 않도록 서비스 워커 설치 단계에서 함께 저장한다.
 */
export const EXTERNAL_RUNTIME_ASSETS = {
  tailwindCdn: 'https://cdn.tailwindcss.com',
  googleFontsCss:
    'https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700&display=swap',
} as const;

