const CACHE_NAME = 'fluentia-v12';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=10',
  './app.js?v=15',
  './manifest.json',
  './Fondo.mp4',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalar — cachear archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activar — limpiar caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first para assets, network-first para APIs
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No cachear llamadas a APIs externas
  if (url.hostname === 'api.anthropic.com' || url.hostname === 'api.elevenlabs.io') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first para todo lo demás
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cachear nuevos recursos estáticos
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
