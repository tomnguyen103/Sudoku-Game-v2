// Bump CACHE name on every deploy that changes any asset below.
// Also bump query strings in index.html script/link tags to match.
const CACHE = 'sudoku-v14';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/style.css',
  '/src/solver.js',
  '/src/generator.js',
  '/src/visualizer.js',
  '/vendor/tailwindcss.js',
  '/vendor/alpine.min.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
