/* Dream service worker — offline app shell.
 *
 * - Precaches the build output (index.html, hashed JS/CSS, icons, manifest)
 *   under a content-hashed cache name; older caches are deleted on activate.
 * - Navigations are network-first, falling back to the precached index.html
 *   when the network is unavailable.
 * - Same-origin GET assets are cache-first.
 * - Everything else bypasses the cache entirely: non-GET requests and ALL
 *   cross-origin requests (AI provider API calls must never be cached).
 * - No skipWaiting on install: updates activate only when the user asks
 *   (the app posts { type: 'DREAM_SKIP_WAITING' }) or when every tab has
 *   moved on by itself.
 *
 * The two placeholders are replaced at build time by the dream-service-worker
 * plugin in vite.config.ts; this file is never registered in dev.
 */
const CACHE_NAME = '__DREAM_CACHE_NAME__';
const PRECACHE = '__DREAM_PRECACHE__'; // build replaces the string with the asset list

const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE.map(scoped))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dream-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'DREAM_SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await caches.match(scoped('index.html'));
        return fallback || Response.error();
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
