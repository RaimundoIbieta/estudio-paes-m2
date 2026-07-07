const CACHE = 'estudio-paes-v4';
const ASSETS = [
  './', './index.html', './css/styles.css', './manifest.json',
  './js/app.js', './js/router.js', './js/storage.js', './js/auth.js', './js/config.js',
  './js/guards.js', './js/learning-path.js', './js/essay-runner.js',
  './js/diagrams.js', './js/test-context.js', './js/local-auth.js',
  './js/pages/home.js', './js/pages/content.js', './js/pages/exercises.js',
  './js/pages/essays.js', './js/pages/progress.js', './js/pages/select-test.js',
  './js/pages/login.js', './js/pages/admin.js', './js/pages/biblioteca.js',
  './js/pages/landing.js', './js/pages/subscription.js',
  './data/tests.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
