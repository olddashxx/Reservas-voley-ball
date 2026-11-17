/* ============================================================================
   [FUNCIONALIDAD PWA OFFLINE-FIRST]: Service Worker — DeporZone Wally Park
   - Pre-cachea recursos locales en el evento 'install'
   - Limpia versiones antiguas de caché en 'activate'
   - Responde peticiones HTTP desde Cache Storage con fallback a red en 'fetch'
   ============================================================================ */

const CACHE_NAME = 'deporzone-pwa-cache-v6';

// Recursos esenciales locales para funcionar sin conexión (incluye index.html y mobile.html)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './mobile.html',
  './styles.css',
  './script.js',
  './manifest.json'
];

// Librerías CDN opcionales (no bloquean la instalación si no hay acceso externo)
const CDN_ASSETS = [
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// 1. Evento Instalación (install): Cachea los activos esenciales de DeporZone
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      CDN_ASSETS.forEach((url) => {
        cache.add(url).catch(() => {
          console.log('[PWA DeporZone] Recurso CDN omitido en precaché inicial:', url);
        });
      });
      return cache.addAll(LOCAL_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Evento Activación (activate): Elimina cachés obsoletas de versiones previas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

// 3. Evento Fetch: Estrategia Cache-First con actualización de red y respaldo offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./mobile.html');
          }
        });
    })
  );
});
