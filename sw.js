/* Moonlight_童話鎮：離線 App Shell 快取 */
const CACHE_VERSION = 'moonlight-offline-v13';
const APP_SHELL = ['./', './index.html', './IMG_5505.jpeg'];
const STATIC_HOSTS = new Set([
  'www.gstatic.com',
  'cdn.tailwindcss.com',
  'cdnjs.cloudflare.com'
]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('moonlight-offline-') && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isAppNavigation = request.mode === 'navigate' && url.origin === self.location.origin;
  const isLocalAsset = url.origin === self.location.origin;
  const isStaticCdn = STATIC_HOSTS.has(url.hostname);
  if (!isAppNavigation && !isLocalAsset && !isStaticCdn) return;

  if (isAppNavigation) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) await cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (error) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return cached || Response.error();
    }
  })());
});
