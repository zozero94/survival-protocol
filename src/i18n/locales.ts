/**
 * [i18n Layer]
 * 지원 언어 정의 및 메타데이터
 */
export type SupportedLocale = 'ko' | 'en' | 'ja' | 'es' | 'de' | 'pt' | 'zh-TW';

export interface LocaleMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleMeta> = {
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  'zh-TW': { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇹🇼' },
};

export const DEFAULT_LOCALE: SupportedLocale = 'ko';

/**
 * 클라이언트 브라우저 환경 기반 정밀 언어 감지 스니펫 (Head FOUC 차단 및 Runtime 공통 SSOT)
 */
export const CLIENT_LOCALE_DETECTOR_BODY = `
  var urlParams = new URLSearchParams(window.location.search);
  var lang = urlParams.get('lang');
  if (!lang) {
    try { lang = localStorage.getItem('archive0_locale'); } catch(e) {}
  }
  if (!lang) {
    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.startsWith('ja')) lang = 'ja';
    else if (nav.startsWith('es')) lang = 'es';
    else if (nav.startsWith('de')) lang = 'de';
    else if (nav.startsWith('pt')) lang = 'pt';
    else if (nav.startsWith('zh')) lang = 'zh-TW';
    else if (nav.startsWith('en')) lang = 'en';
    else lang = 'ko';
  }
`.trim();
