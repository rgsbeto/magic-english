const CACHE_NAME = 'magic-english-v2';

// Install – cache shell assets using relative paths resolved at runtime
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Resolve relative to SW scope (works on any subdirectory like GitHub Pages)
      const base = self.registration.scope;
      const localAssets = [
        'index.html',
        'manifest.json',
        'icons/icon-192.png',
        'icons/icon-512.png'
      ].map(p => new URL(p, base).href);

      const externalAssets = [
        'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap',
        'https://unpkg.com/react@18/umd/react.production.min.js',
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
      ];

      const all = [...localAssets, ...externalAssets];
      return Promise.allSettled(
        all.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch – cache-first for app shell, network-first for external
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // YouTube links – don't cache
  if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && (url.origin === self.location.origin || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('unpkg.com'))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback – resolve index.html relative to scope
          if (event.request.destination === 'document') {
            const fallback = new URL('index.html', self.registration.scope).href;
            return caches.match(fallback);
          }
        });
    })
  );
});
