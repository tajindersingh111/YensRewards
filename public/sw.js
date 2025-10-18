const CACHE_NAME = 'yens-loyalty-v21-FORCE-CLEAR';
const urlsToCache = [
  '/',
  '/customer',
  '/barista',
  '/admin',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/manifest-customer.json',
  '/manifest-barista.json',
  '/manifest-admin.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
