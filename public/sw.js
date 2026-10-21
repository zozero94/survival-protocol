/* 자동 생성 파일 - 직접 수정하지 말 것 (src/services/pwa.service.ts) */
const CACHE_VERSION = "survival-c5491a1aef5e";
const CACHE_PREFIX = 'survival-';
const PRECACHE_URLS = ["/index.html","/","/svgs/pr01-outcome.svg","/svgs/pr02-outcome.svg","/svgs/pr03-outcome.svg","/svgs/pr04-outcome.svg","/svgs/pr05-outcome.svg","/svgs/pr06-outcome.svg","/svgs/pr08-outcome.svg","/svgs/pr09-outcome.svg","/svgs/pr10-outcome.svg","/svgs/pr11-outcome.svg","/svgs/pr12-outcome.svg","/svgs/pr13-outcome.svg","/assets/fuse.basic.min.js","/assets/search-index.js","/protocol-01.html","/protocol-01","/protocol-02.html","/protocol-02","/protocol-03.html","/protocol-03","/protocol-04.html","/protocol-04","/protocol-05.html","/protocol-05","/protocol-06.html","/protocol-06","/protocol-08.html","/protocol-08","/protocol-09.html","/protocol-09","/protocol-10.html","/protocol-10","/protocol-11.html","/protocol-11","/protocol-12.html","/protocol-12","/protocol-13.html","/protocol-13"];
const EXTERNAL_URLS = ["https://cdn.tailwindcss.com","https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,300;0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700&display=swap"];
const NAVIGATION_FALLBACK = "/index.html";
const ALLOWED_EXTERNAL_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

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
    event.respondWith(cachePromise.then(async (cache) => {
      try {
        const fresh = await fetchAndStore(cache, key, request);
        if (fresh) return fresh;
      } catch (error) {}
      const cached = await matchNavigation(cache, url);
      if (cached) return cached;
      return (await cache.match(toAbsolute(NAVIGATION_FALLBACK))) || offlineResponse();
    }));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname === '/assets/search-index.js') {
      event.respondWith(cachePromise.then(async (cache) => {
        try {
          const fresh = await fetchAndStore(cache, request.url, request);
          if (fresh) return fresh;
        } catch (error) {}
        return (await cache.match(request.url)) || offlineResponse();
      }));
      return;
    }
    event.respondWith(cachePromise.then(async (cache) => {
      const cached = await cache.match(request.url);
      return cached || fetchAndStore(cache, request.url, request);
    }));
    return;
  }

  if (!ALLOWED_EXTERNAL_HOSTS.includes(url.hostname)) return;

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
