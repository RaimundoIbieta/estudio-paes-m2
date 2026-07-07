const CACHE = 'estudio-paes-m2-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/storage.js',
  './js/pages/home.js',
  './js/pages/content.js',
  './js/pages/exercises.js',
  './js/pages/essays.js',
  './js/pages/progress.js',
  './data/content.json',
  './data/exercises.json',
  './data/essays.json',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
