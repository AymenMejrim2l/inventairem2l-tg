const CACHE_NAME = 'm2ltg-inventory-cache-v5'; // Version du cache incrémentée
const urlsToCache = [
  './',
  './index.html',
  './js/app.js',
  './js/storage.js',
  './js/store.js', // Ajouté pour le cache
  './js/ui/notifications.js', // Ajouté pour le cache
  './js/ui/feedback.js', // Ajouté pour le cache
  './audio/success.mp3', // Nouveau son de succès local
  './audio/error.mp3',   // Nouveau son d'erreur local
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  // Les anciens chemins de sons externes ont été supprimés
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});