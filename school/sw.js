const CACHE = 'sz-school-district-v2';
const ASSETS = ['./', './index.html', './style.css', './app.js', './official-district-data.js', './school-districts-official.json', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const url = new URL(request.url);
  const isAppAsset = request.mode === 'navigate' || /\.(?:html|css|js|json|webmanifest)$/i.test(url.pathname);
  const updateCache = response => {
    if (response && response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
    return response;
  };
  event.respondWith(
    isAppAsset
      ? fetch(request).then(updateCache).catch(() => caches.match(request))
      : caches.match(request).then(cached => cached || fetch(request).then(updateCache))
  );
});
