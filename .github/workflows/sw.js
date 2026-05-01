const CACHE_NAME = 'die-retry-mj-v1';
const ASSETS = [
  './mj_tool.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap'
];

// Installation — mise en cache des assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Certains assets non mis en cache (normal si hors ligne) :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first pour les assets locaux, network-first pour YouTube
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // YouTube et ressources externes : toujours réseau (pas de cache)
  if (url.hostname.includes('youtube') || url.hostname.includes('googleapis') || url.hostname.includes('ytimg')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Fonts Google : stale-while-revalidate
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const network = fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          });
          return cached || network;
        })
      )
    );
    return;
  }

  // Assets locaux : cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, res.clone());
          return res;
        });
      });
    }).catch(() => caches.match('./mj_tool.html'))
  );
});
