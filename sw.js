const CACHE_NAME = 'lubetrack-v7';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pcm.html',
  './almoxarifado.html',
  './app.js',
  './data.js',
  './style.css',
  './firebase-config.js',
  './manifest.json',
  './FORM_117 (1).xlsx~1/resources/logo_esa.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install Event - Caches the assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Pre-caching offline assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Cleans up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate strategy for app assets
self.addEventListener('fetch', event => {
  // Ignora requisições para o Firebase e outras APIs externas (deixa passar direto ou tenta cache fallback se falhar)
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebase') || 
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Atualiza o cache silenciosamente em background
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se a rede falhar, retorna o cache já existente
        return cachedResponse;
      });

      // Retorna o cache imediatamente se existir, caso contrário aguarda o fetch
      return cachedResponse || fetchPromise;
    })
  );
});
