import { createHash } from 'node:crypto';
import { SITE_META, PWA_PATHS } from '../site.config.ts';

/**
 * 서비스 워커 로직이 바뀌면 이 값을 올린다. 캐시 버전 해시에 포함되어
 * 콘텐츠가 그대로여도 기존 방문자의 캐시가 새 로직으로 교체된다.
 */
export const SW_TEMPLATE_REVISION = 1;

export interface PrecacheEntry {
  url: string;      // 사이트 루트 기준 경로 (예: '/protocol-01.html')
  content: string;  // 파일 내용 (캐시 버전 해시 계산용)
}

export interface ServiceWorkerOptions {
  cacheVersion: string;
  precacheUrls: string[];
  externalUrls: string[];
  navigationFallback: string;
}

/**
 * [Service Layer]
 * 오프라인 열람(PWA)용 서비스 워커, 웹 앱 매니페스트, 아이콘을 빌드 타임에 생성한다.
 * 모든 메서드는 순수 함수(문자열 반환)이며, 파일 쓰기는 pipeline.ts가 담당한다.
 */
export class PwaService {
  /**
   * 사전 캐시 대상 파일 내용 + 외부 자원 목록 + 템플릿 리비전으로 캐시 버전을 만든다.
   * 콘텐츠가 한 글자라도 바뀌면 sw.js 바이트가 바뀌고, 브라우저가 새 워커를 설치해 캐시를 교체한다.
   */
  public static computeCacheVersion(entries: PrecacheEntry[], externalUrls: string[]): string {
    const hash = createHash('sha256');
    hash.update(`rev:${SW_TEMPLATE_REVISION}\n`);
    for (const entry of [...entries].sort((a, b) => a.url.localeCompare(b.url))) {
      hash.update(`${entry.url}\n${entry.content}\n`);
    }
    for (const url of externalUrls) {
      hash.update(`ext:${url}\n`);
    }
    return `survival-${hash.digest('hex').slice(0, 12)}`;
  }

  /**
   * 캐시 전략
   * - 페이지 이동(navigate): 캐시 즉시 응답 + 백그라운드 갱신(stale-while-revalidate).
   *   ?lang= 등 쿼리는 클라이언트 상태이므로 캐시 키에서 제거한다.
   * - 같은 출처 정적 자원: cache-first (버전 해시로 무효화되므로 안전).
   * - 외부 CDN/폰트: stale-while-revalidate, opaque 응답 허용.
   * - 오프라인 + 캐시 미스: navigationFallback 페이지 → 그것도 없으면 최소 안내 문구.
   */
  public static buildServiceWorker(options: ServiceWorkerOptions): string {
    const { cacheVersion, precacheUrls, externalUrls, navigationFallback } = options;

    return `/* 자동 생성 파일 - 직접 수정하지 말 것 (src/services/pwa.service.ts) */
const CACHE_VERSION = ${JSON.stringify(cacheVersion)};
const CACHE_PREFIX = 'survival-';
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};
const EXTERNAL_URLS = ${JSON.stringify(externalUrls)};
const NAVIGATION_FALLBACK = ${JSON.stringify(navigationFallback)};

function toAbsolute(path) {
  return new URL(path, self.location.href).href;
}

function isCacheable(response) {
  return Boolean(response) && (response.ok || response.type === 'opaque');
}

async function fetchAndStore(cache, key, request) {
  const response = await fetch(request);
  if (isCacheable(response)) {
    await cache.put(key, response.clone());
  }
  return response;
}

function offlineResponse() {
  return new Response('오프라인 상태입니다. 이 페이지는 아직 기기에 저장되지 않았습니다.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function matchNavigation(cache, url) {
  const exact = await cache.match(url.origin + url.pathname);
  if (exact) return exact;
  // 확장자 없는 주소(/protocol-01, /)도 저장된 .html 파일로 연결
  const alt = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname + '.html';
  return cache.match(url.origin + alt);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(PRECACHE_URLS.map((path) => new Request(toAbsolute(path), { cache: 'reload' })));
    // 외부 자원은 실패해도 설치를 막지 않는다 (네트워크 불안정 대비)
    await Promise.all(EXTERNAL_URLS.map(async (url) => {
      try {
        const response = await fetch(new Request(url, { mode: 'no-cors' }));
        if (isCacheable(response)) await cache.put(url, response);
      } catch (error) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const cachePromise = caches.open(CACHE_VERSION);

  if (request.mode === 'navigate') {
    const key = url.origin + url.pathname;
    const networkPromise = cachePromise
      .then((cache) => fetchAndStore(cache, key, request))
      .catch(() => null);
    event.waitUntil(networkPromise);
    event.respondWith(cachePromise.then(async (cache) => {
      const cached = await matchNavigation(cache, url);
      if (cached) return cached;
      const fresh = await networkPromise;
      if (fresh) return fresh;
      return (await cache.match(toAbsolute(NAVIGATION_FALLBACK))) || offlineResponse();
    }));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cachePromise.then(async (cache) => {
      const cached = await cache.match(request.url);
      return cached || fetchAndStore(cache, request.url, request);
    }));
    return;
  }

  const networkPromise = cachePromise
    .then((cache) => fetchAndStore(cache, request.url, request))
    .catch(() => null);
  event.waitUntil(networkPromise);
  event.respondWith(cachePromise.then(async (cache) => {
    const cached = await cache.match(request.url);
    if (cached) return cached;
    return (await networkPromise) || offlineResponse();
  }));
});
`;
  }

  public static buildManifest(startUrl: string): string {
    const manifest = {
      name: SITE_META.name,
      short_name: SITE_META.shortName,
      description: SITE_META.description,
      lang: SITE_META.lang,
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      background_color: SITE_META.backgroundColor,
      theme_color: SITE_META.themeColor,
      icons: [
        { src: PWA_PATHS.icon, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    };
    return JSON.stringify(manifest, null, 2);
  }

  /** 임시 단색 아이콘 (최종 아이콘은 디자인 확정 후 교체) */
  public static buildIconSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${SITE_META.backgroundColor}"/>
  <rect x="48" y="48" width="416" height="416" fill="none" stroke="#E5E5E5" stroke-width="12"/>
  <path d="M256 128 L368 352 L144 352 Z" fill="none" stroke="#E5E5E5" stroke-width="16" stroke-linejoin="miter"/>
  <line x1="112" y1="392" x2="400" y2="392" stroke="#E5E5E5" stroke-width="16"/>
</svg>
`;
  }
}
