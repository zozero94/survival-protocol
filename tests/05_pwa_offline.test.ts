import test from 'node:test';
import assert from 'node:assert/strict';
import { PwaService } from '../src/services/pwa.service.ts';
import { getPwaRuntimeScript } from '../src/state/pwa.state.ts';
import { SITE_META, PWA_PATHS, EXTERNAL_RUNTIME_ASSETS } from '../src/site.config.ts';

test('PWA Suite: computeCacheVersion은 결정론적이며 변경에 민감해야 한다', () => {
  const entries1 = [
    { url: '/protocol-01.html', content: '<html>content-a</html>' },
    { url: '/index.html', content: '<html>content-index</html>' },
  ];
  const entries2 = [
    { url: '/protocol-01.html', content: '<html>content-a</html>' },
    { url: '/index.html', content: '<html>content-index</html>' },
  ];
  const externalUrls = [EXTERNAL_RUNTIME_ASSETS.tailwindCdn];

  const version1 = PwaService.computeCacheVersion(entries1, externalUrls);
  const version2 = PwaService.computeCacheVersion(entries2, externalUrls);

  assert.equal(version1, version2, '동일한 콘텐츠와 외부 자원에 대해 해시 버전이 일치해야 합니다.');
  assert.match(version1, /^survival-[a-f0-9]{12}$/, '캐시 버전 형식은 survival-[12자리 16진수]여야 합니다.');

  // 내용 변경 시 버전 변경 검증
  const entriesModified = [
    { url: '/protocol-01.html', content: '<html>content-MODIFIED</html>' },
    { url: '/index.html', content: '<html>content-index</html>' },
  ];
  const versionModified = PwaService.computeCacheVersion(entriesModified, externalUrls);
  assert.notEqual(version1, versionModified, '콘텐츠가 1바이트라도 변경되면 캐시 버전이 달라져야 합니다.');
});

test('PWA Suite: buildServiceWorker는 필수 생명주기와 오프라인 캐시 전략을 온전히 포함해야 한다', () => {
  const swCode = PwaService.buildServiceWorker({
    cacheVersion: 'survival-test123456',
    precacheUrls: ['/protocol-01.html', '/index.html', '/'],
    externalUrls: [EXTERNAL_RUNTIME_ASSETS.tailwindCdn],
    navigationFallback: '/protocol-01.html',
  });

  assert.ok(swCode.includes('CACHE_VERSION = "survival-test123456"'), '버전 상수가 주입되어야 합니다.');
  assert.ok(swCode.includes('/protocol-01.html'), '사전 캐시 URL이 포함되어야 합니다.');
  assert.ok(swCode.includes('addEventListener(\'install\''), 'install 이벤트 핸들러가 존재해야 합니다.');
  assert.ok(swCode.includes('addEventListener(\'activate\''), 'activate 이벤트 핸들러가 존재해야 합니다.');
  assert.ok(swCode.includes('addEventListener(\'fetch\''), 'fetch 이벤트 핸들러가 존재해야 합니다.');
  assert.ok(swCode.includes('skipWaiting()'), '즉시 활성화를 위한 skipWaiting이 있어야 합니다.');
  assert.ok(swCode.includes('clients.claim()'), '즉시 제어를 위한 clients.claim이 있어야 합니다.');
  assert.ok(swCode.includes('request.mode === \'navigate\''), '네비게이션 요청 처리가 분기되어야 합니다.');
});

test('PWA Suite: buildManifest는 유효한 Web App Manifest JSON을 생성해야 한다', () => {
  const manifestRaw = PwaService.buildManifest('/protocol-01.html');
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.name, SITE_META.name);
  assert.equal(manifest.short_name, SITE_META.shortName);
  assert.equal(manifest.start_url, '/protocol-01.html');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, SITE_META.themeColor);
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, '아이콘 배열이 포함되어야 합니다.');
  assert.equal(manifest.icons[0].src, PWA_PATHS.icon);
});

test('PWA Suite: buildIconSvg는 표준 SVG 문법을 만족해야 한다', () => {
  const svg = PwaService.buildIconSvg();
  assert.ok(svg.startsWith('<svg'), 'SVG 루트 태그로 시작해야 합니다.');
  assert.ok(svg.includes('viewBox="0 0 512 512"'), '512x512 뷰포트가 지정되어야 합니다.');
  assert.ok(svg.endsWith('</svg>\n'), 'SVG 닫는 태그로 끝나야 합니다.');
});

test('PWA Suite: getPwaRuntimeScript는 선언적 HTML 속성을 동기화해야 한다', () => {
  const script = getPwaRuntimeScript();
  assert.ok(script.includes("root.setAttribute('data-network'"), '네트워크 상태 감지 속성이 설정되어야 합니다.');
  assert.ok(script.includes("root.setAttribute('data-offline-ready'"), '오프라인 준비 상태 속성이 설정되어야 합니다.');
  assert.ok(script.includes(PWA_PATHS.serviceWorker), '서비스 워커 등록 경로가 포함되어야 합니다.');
});
