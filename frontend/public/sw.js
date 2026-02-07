
// Kill Switch Service Worker
// This service worker immediately unregisters any existing service workers
// and forces the page to reload to clear the cache.

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                return caches.delete(key);
            }));
        }).then(() => {
            return self.clients.claim();
        })
    );
});
