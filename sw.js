/* onesecond Service Worker — v2 (2026-05-14 5/18 D-4 PWA 캐시 회귀 처방)
 * 본진: PWA 박음 + network-first 전략 (정적 자산 + HTML 통째)
 * 옛 격차: v1 박힌 자리 = 정적 자산 cache-first 박혀 홈 화면 PWA 진입 시
 *         옛 화면 박힘. v2 박음 = network-first 통째 박음 + CACHE_NAME 갱신
 *         트리거 박음.
 * 박지 X 본진: 푸시 알림 (v1.2 박을 예정)
 */

const CACHE_NAME = 'onesecond-v132-20260604-webpush';
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
    Promise.all([
      /* 옛 캐시 통째 청소 (CACHE_NAME 갱신 시 자동 박음) */
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      ),
      /* 모든 클라이언트 즉시 제어 박음 */
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  /* GET 본진만 (POST·PATCH·DELETE 통째 통과) */
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* Supabase REST 본진 통과 (캐시 박지 X — 실 데이터 정합) */
  if (url.hostname.includes('supabase.co')) return;
  /* CDN 폰트·외부 자산 통과 (cache 박지 X) */
  if (url.origin !== self.location.origin) return;

  /* network-first 통째 박음 — HTML + 정적 자산 정합
     옛 v1 격차: 정적 자산 cache-first 박혀 PWA 진입 시 옛 화면 박힘
     v2 처방: network-first + 새 응답 박힘 시 캐시 박음 + 네트워크 실패 시 폴백 */
  event.respondWith(
    fetch(req).then((resp) => {
      /* 새 응답 박힘 = 캐시 박음 (다음 오프라인 진입 시 폴백 정합) */
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => null);
      }
      return resp;
    }).catch(() => {
      /* 네트워크 실패 시 캐시 폴백 박음 */
      return caches.match(req).then((r) => r || caches.match('/'));
    })
  );
});

/* ── 웹 푸시 (Phase 3, 2026-06-04) ──
 * push 수신 → 알림 표시 / 알림 클릭 → 해당 화면 열기. fetch 가로채기 없음(위 캐시 로직과 독립). */
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { try { d = { body: event.data ? event.data.text() : '' }; } catch (_e) {} }
  const title = d.title || '원세컨드 새 글';
  const opts = {
    body: d.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || '/app.html' }
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (let i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(target) > -1 && 'focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
