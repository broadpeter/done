const CACHE_NAME = 'activity-done-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192-b.png',
  './icon-512-b.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name.startsWith('activity-done-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached || (event.request.mode === 'navigate' && caches.match('./index.html')) || Response.error();
      })
  );
});