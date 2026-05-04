const CACHE_NAME = 'magic-english-v3';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const base = self.registration.scope;
      const local = ['index.html','manifest.json','icons/icon-192.png','icons/icon-512.png']
        .map(p => new URL(p, base).href);
      const ext = [
        'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap',
        'https://unpkg.com/react@18/umd/react.production.min.js',
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
      ];
      return Promise.allSettled([...local,...ext].map(u => cache.add(u).catch(() => {})));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && (url.origin === self.location.origin || url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com') || url.hostname.includes('unpkg.com'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(new URL('index.html', self.registration.scope).href);
        }
      });
    })
  );
});
