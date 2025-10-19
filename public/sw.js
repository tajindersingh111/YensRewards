const CACHE_NAME = 'yens-loyalty-v51-FORCE-UPDATE-20251019';
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
  // Network-first strategy for HTML pages, cache-first for assets
  const url = new URL(event.request.url);
  
  // For HTML pages and API calls: always fetch fresh from network
  if (event.request.mode === 'navigate' || 
      url.pathname.startsWith('/api/') ||
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request)) // Fallback to cache if offline
    );
    return;
  }
  
  // For static assets (images, CSS, JS): use cache-first
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
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

// iOS Fix: Listen for SKIP_WAITING message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
