const CACHE = 'estudio-paes-v2';
const ASSETS = [
  './', './index.html', './css/styles.css', './manifest.json',
  './js/app.js', './js/router.js', './js/storage.js', './js/auth.js', './js/config.js',
  './js/diagrams.js', './js/test-context.js',
  './js/pages/home.js', './js/pages/content.js', './js/pages/exercises.js',
  './js/pages/essays.js', './js/pages/progress.js', './js/pages/select-test.js',
  './js/pages/login.js', './js/pages/admin.js',
  './data/tests.json', './data/content.json', './data/exercises.json', './data/essays.json',
  './data/m1/content.json', './data/m1/exercises.json', './data/m1/essays.json',
  './assets/temario-m2.pdf',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
