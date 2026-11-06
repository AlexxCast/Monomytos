// Monomythos Service Worker - Fast offline cache
const CACHE_NAME = 'monomythos-v64';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/tema.css',
  './css/tema-pop.css',
  './css/demo.css',
  './js/lingua_en.js',
  './js/storia_en.js',
  './js/lingua.js',
  './js/dialogo.js',
  './js/adatta.js',
  './js/glossario.js',
  './js/cards_data.js',
  './js/morale.js',
  './js/minacce_effetti.js',
  './js/audio.js',
  './js/bilanciamento.js',
  './js/engine.js',
  './js/net.js',
  './js/ui.js',
  './js/firebase-config.js',
  './js/account.js',
  './js/collezione.js',
  './js/online.js',
  './js/scambi.js',
  './js/storia.js',
  './js/storia_suoni.js',
  './js/tutorial.js',
  './js/demo.js',
  './js/particelle.js',
  './assets/icons/logo_titolo.webp',
  './assets/bg/cosmo_eroe.webp',
  './assets/bg/cosmo_villain.webp',
  './assets/icons/logo.png',
  './assets/icons/azione.webp',
  './assets/icons/minaccia.webp',
  './assets/icons/peronaggio.webp'
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

// Prima la rete (così gli aggiornamenti arrivano subito), la cache solo offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
