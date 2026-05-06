// sw.js — Service Worker для DiamKey (офлайн-доступ)

const CACHE_NAME = 'diamkey-v2';
const urlsToCache = [
  '.',
  'index.html',
  'oauth.html',
  'manifest.json',
  'KeyHold.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Возвращаем кэш, если есть; иначе сеть
        return cachedResponse || fetch(event.request).then(networkResponse => {
          // Кэшируем новые запросы (только GET)
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});
