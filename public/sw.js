const SW_VERSION = 'job-khoj-sw-v5';
const CACHE = SW_VERSION;
const STATIC_ASSETS = ['/','/index.html','/manifest.webmanifest','/favicon.svg'];

self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try { await cache.addAll(STATIC_ASSETS); } catch {}
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Vite fingerprinted assets can safely be cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const response = await fetch(req);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(req, response.clone());
        }
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Navigation documents should stay fresh so deployments are picked up.
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith((async () => {
      try {
        const response = await fetch(req, { cache: 'no-store' });
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('/index.html', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Other first-party GETs use stale-while-revalidate.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(req, response.clone());
      }
      return response;
    }).catch(() => cached);
    return cached || network;
  })());
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'JOB KHOJ', body: event.data?.text() || 'New job update available.' };
  }

  const rawUrl = typeof data.url === 'string' ? data.url : '/';
  let url = '/';
  try {
    const u = new URL(rawUrl, self.location.origin);
    if (u.origin === self.location.origin) url = u.pathname + u.search + u.hash;
  } catch {}

  event.waitUntil(self.registration.showNotification(
    String(data.title || 'JOB KHOJ').slice(0, 120),
    {
      body: String(data.body || 'New job update available.').slice(0, 500),
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url }
    }
  ));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});
