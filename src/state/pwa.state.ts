import { PWA_PATHS } from '../site.config.ts';

/**
 * [State / ViewModel Layer]
 * 오프라인 열람 상태를 <html> 데이터 속성으로 노출한다 (UI는 속성만 보고 표시).
 *   data-network       : 'online' | 'offline'
 *   data-offline-ready : 'true'  (서비스 워커 활성 = 사전 캐시 완료)
 *                        'false' (등록 실패) | 'unsupported' (미지원 브라우저/비보안 컨텍스트)
 */
export function getPwaRuntimeScript(): string {
  return `
    (function () {
      var root = document.documentElement;
      function syncNetwork() {
        root.setAttribute('data-network', navigator.onLine ? 'online' : 'offline');
      }
      syncNetwork();
      window.addEventListener('online', syncNetwork);
      window.addEventListener('offline', syncNetwork);

      if (!('serviceWorker' in navigator)) {
        root.setAttribute('data-offline-ready', 'unsupported');
        return;
      }
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('${PWA_PATHS.serviceWorker}')
          .then(function () { return navigator.serviceWorker.ready; })
          .then(function () { root.setAttribute('data-offline-ready', 'true'); })
          .catch(function () { root.setAttribute('data-offline-ready', 'false'); });
      });
    })();
  `.trim();
}
