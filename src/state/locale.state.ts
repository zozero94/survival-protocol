import { SUPPORTED_LOCALES, CLIENT_LOCALE_DETECTOR_BODY } from '../i18n/locales.ts';
import { UI_STRINGS } from '../i18n/ui-strings.ts';

/**
 * [State / ViewModel Layer]
 * 100% 선언적(Declarative) data-i18n & data-proto 범용 데이터 바인딩 핫스왑 엔진 (SSOT)
 */
export function getLocaleRuntimeScript(): string {
  return `
    window.__SUPPORTED_LOCALES__ = ${JSON.stringify(Object.keys(SUPPORTED_LOCALES))};
    window.__UI_STRINGS__ = ${JSON.stringify(UI_STRINGS)};

    /**
     * W3C 표준 브라우저 헤더 및 환경 감지 (URL -> localStorage -> navigator.language -> 기본값)
     */
    function detectInitialLocale() {
      ${CLIENT_LOCALE_DETECTOR_BODY}
      return (lang && window.__PROTOCOLS__[lang]) ? lang : 'ko';
    }

    /**
     * 100% 선언적 범용 데이터 바인딩 0.01초 핫스왑 엔진
     */
    function switchLocale(targetLocale) {
      var proto = window.__PROTOCOLS__[targetLocale];
      var ui = window.__UI_STRINGS__[targetLocale];
      if (!proto || !ui) {
        showToast('해당 언어는 현재 준비 중입니다.');
        return;
      }

      document.documentElement.lang = targetLocale;
      try { localStorage.setItem('archive0_locale', targetLocale); } catch(e) {}

      // 1. [선언적 엔진] UI 정적 문자열 자동 매핑 (data-i18n)
      document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (ui[key] !== undefined) el.innerText = ui[key];
      });

      // 2. [선언적 엔진] 프로토콜 단일 필드 자동 매핑 (data-proto)
      document.querySelectorAll('[data-proto]').forEach(function(el) {
        var field = el.getAttribute('data-proto');
        if (proto[field] !== undefined) el.innerText = proto[field];
      });

      // 3. [선언적 엔진] 배열 반복 아이템 범용 자동 매핑 (data-proto-item, data-proto-prop, data-index)
      document.querySelectorAll('[data-proto-item]').forEach(function(el) {
        var itemKey = el.getAttribute('data-proto-item');
        var prop = el.getAttribute('data-proto-prop');
        var idx = parseInt(el.getAttribute('data-index'), 10);
        if (proto[itemKey] && proto[itemKey][idx] && proto[itemKey][idx][prop] !== undefined) {
          el.innerText = proto[itemKey][idx][prop];
        }
      });

      // 4. [선언적 엔진] 치명적 실수(Fatal Mistake) 중첩 객체 자동 매핑 (data-proto-fatal)
      document.querySelectorAll('[data-proto-fatal]').forEach(function(el) {
        var prop = el.getAttribute('data-proto-fatal');
        if (proto.fatalMistake && proto.fatalMistake[prop] !== undefined) {
          el.innerText = proto.fatalMistake[prop];
        }
      });

      // 5. 언어 스위처 UI 버튼 액티브 스타일 동기화
      document.querySelectorAll('[data-locale-btn]').forEach(function(btn) {
        var code = btn.getAttribute('data-locale-btn');
        btn.className = (code === targetLocale)
          ? 'px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all bg-white text-black'
          : 'px-1.5 py-0.5 text-[11px] font-mono font-bold transition-all text-neutral-400 hover:text-white';
      });

      // 6. 체크리스트 카운터 실시간 재연산
      if (typeof updateChecklist === 'function') updateChecklist();

      // 7. URL 파라미터 무새로고침 동기화
      if (window.history && window.history.replaceState) {
        var newUrl = window.location.pathname + '?lang=' + targetLocale;
        window.history.replaceState(null, '', newUrl);
      }

      // 8. FOUC 쉴드 해제 (깜빡임 없이 부드러운 렌더링 확정)
      document.documentElement.removeAttribute('data-fouc');
    }
  `.trim();
}
