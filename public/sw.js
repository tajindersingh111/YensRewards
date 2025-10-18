// Service worker disabled - always fetch from network for development
const CACHE_NAME = 'yens-loyalty-DISABLED';

self.addEventListener('install', (event) => {
  // Clear ALL caches on install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Clear ALL caches on activate
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // ALWAYS fetch from network - no caching
  event.respondWith(
    fetch(event.request)
  );
});
