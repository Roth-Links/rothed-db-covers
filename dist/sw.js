// RothedDB Service Worker v1.4 — added explicit ad-domain bypass (AdSense)
// Strategy:
//   - database.json      → stale-while-revalidate (instant load, update in bg)
//   - HTML               → network-first (selalu fresh, fallback cache)
//   - static assets      → cache-first (JS, CSS, fonts)
//   - GAS / API calls    → network-only (jangan cache, selalu fresh)
//   - push notifications → handled here

const BUILD_TS      = '1789955910';        // di-replace 1.py tiap build
const CACHE_STATIC  = `rdb-static-${BUILD_TS}`;
const CACHE_DATA    = `rdb-data-${BUILD_TS}`;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/database.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
];

// ── INSTALL — pre-cache static assets ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    ).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — hapus cache lama ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DATA)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — routing strategy ───────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. GAS / API / ipapi — network only, jangan cache
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('ipapi.co') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('action=')
  ) {
    return; // browser handle sendiri
  }

  // 1b. Ad domains (AdSense/DoubleClick) — jangan pernah di-cache, biarkan
  //     browser handle langsung ke network. Ini sudah terjadi otomatis
  //     karena domain ini tidak match rule manapun di bawah, tapi ditulis
  //     eksplisit di sini biar jelas & tidak ke-cache tidak sengaja kalau
  //     rule lain diubah di masa depan.
  if (
    url.hostname.includes('googlesyndication.com') ||
    url.hostname.includes('doubleclick.net') ||
    url.hostname.includes('googleadservices.com') ||
    url.hostname.includes('google.com/pagead') ||
    url.hostname.includes('adtrafficquality.google')
  ) {
    return; // browser handle sendiri, no caching
  }

  // 2. database.json — stale-while-revalidate
  //    Return cache dulu (cepat), update di background
  if (url.pathname.endsWith('database.json') || url.pathname.endsWith('changelog.json')) {
    e.respondWith(staleWhileRevalidate(e.request, CACHE_DATA));
    return;
  }

  // 3. Google Fonts — cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(cacheFirst(e.request, CACHE_STATIC));
    return;
  }

  // 4. HTML lokal — network-first (biar selalu fresh), fallback cache
  if (
    url.origin === self.location.origin &&
    (e.request.destination === 'document' || url.pathname.endsWith('.html'))
  ) {
    e.respondWith(networkFirst(e.request, CACHE_STATIC));
    return;
  }

  // 5a. JS / CSS lokal — cache-first, fallback network
  if (
    url.origin === self.location.origin &&
    (e.request.destination === 'script' ||
     e.request.destination === 'style' ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css'))
  ) {
    e.respondWith(cacheFirst(e.request, CACHE_STATIC));
    return;
  }

  // 5. Semua lainnya — network first
});

// ── Helpers ───────────────────────────────────────────────────────

/** Cache-first: return cache kalau ada, fallback ke network dan update cache */
async function cacheFirst(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch(e) {
    return new Response('Offline', { status: 503 });
  }
}

/** Network-first: coba network dulu, fallback ke cache kalau offline */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch(e) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/** Stale-while-revalidate: return cache seketika, fetch baru di background */
async function staleWhileRevalidate(request, cacheName) {
  const cache      = await caches.open(cacheName);
  const cached     = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

// ── PUSH NOTIFICATION ─────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'RothedDB', {
      body: data.body || 'Your daily CR reward is ready!',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      tag: 'rdb-daily',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const target = e.notification.data?.url || '/';
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
