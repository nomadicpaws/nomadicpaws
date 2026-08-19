const CACHE = 'np-event-register-v1';
const SHELL = [
  '/event-register/',
  '/event-register/register.css',
  '/event-register/register.js',
  '/event-register/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/admin/icon-192.png',
  '/admin/icon-512.png',
  '/fonts/dm-sans-latin.woff2',
  '/fonts/fraunces-latin.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(response => {
    if (response) return response;
    if (event.request.mode === 'navigate') return caches.match('/event-register/');
    return Response.error();
  })));
});
