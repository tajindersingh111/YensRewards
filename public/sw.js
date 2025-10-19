// KILL SWITCH - This service worker unregisters itself immediately
// This breaks the cache lock and allows v51 to load fresh

self.addEventListener('install', () => {
  // Immediately unregister
  self.registration.unregister()
    .then(() => {
      console.log('🗑️ Old service worker unregistered');
      // Delete all caches
      return caches.keys();
    })
    .then((cacheNames) => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    })
    .then(() => {
      console.log('🧹 All caches cleared');
    });
});

self.addEventListener('activate', () => {
  // Force unregister again just to be sure
  self.registration.unregister();
});

// Don't cache anything - just pass through
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
