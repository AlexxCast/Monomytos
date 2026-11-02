// Monomythos Service Worker - Fast offline cache
const CACHE_NAME = 'monomythos-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/cards_data.js',
  './js/audio.js',
  './js/engine.js',
  './js/net.js',
  './js/ui.js',
  './assets/icons/logo.png',
  './assets/icons/azione.png',
  './assets/icons/minaccia.png',
  './assets/icons/peronaggio.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => console.log('SW cache err:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    }).catch(() => fetch(e.request))
  );
});
