/* onesecond Service Worker — v1.1 (2026-05-14 5/18 D-4 박음)
 * 본진: PWA 박음 + 정적 자산 캐싱 + 오프라인 폴백
 * 박지 X 본진: 푸시 알림 (v1.2 박을 예정)
 */

const CACHE_NAME = 'onesecond-v1-20260514';
const CACHE_URLS = [
  '/',
  '/app.html',
  '/pages/home_v2.html',
  '/css/tokens.css',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/og-preview.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      /* addAll 실패 시 무시 박음 (개별 자산 격차 시 SW 자체 박힘 차단 회피) */
      return Promise.all(
        CACHE_URLS.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  /* GET 본진만 (POST·PATCH·DELETE 통째 통과) */
  if (req.method !== 'GET') return;
  /* Supabase REST 본진 통과 (캐시 박지 X — 실 데이터 정합) */
  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co')) return;
  /* 정적 자산 = cache-first, HTML = network-first (라이브 반영 정합) */
  if (req.destination === 'document' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((resp) => {
        /* 같은 origin 정적 자산만 캐시 박음 */
        if (resp.ok && url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return resp;
      });
    })
  );
});
