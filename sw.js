/* ============================================
   GEO MASTER - Service Worker
   Cache strategy: Network First with Cache Fallback
   ============================================ */

const CACHE_NAME = 'geo-master-v1.0.0';
const ASSETS_TO_CACHE = [
  '/geo-games/',
  '/geo-games/index.html',
  '/geo-games/style.css',
  '/geo-games/script.js',
  '/geo-games/countries.json',
  '/geo-games/manifest.json',
  
  // Game pages
  '/geo-games/games/m2n.html',
  '/geo-games/games/n2m.html',
  '/geo-games/games/name.html',
  '/geo-games/games/flag.html',
  '/geo-games/games/riddle.html',
  '/geo-games/games/cap2c.html',
  '/geo-games/games/c2cap.html',
  '/geo-games/games/pop.html',
  '/geo-games/games/area.html',
  '/geo-games/games/challenge.html',
  
  // External resources (CDN)
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&family=Inter:wght@400;600;800&display=swap'
];

// ============================================
// INSTALL EVENT - Cache all assets
// ============================================
self.addEventListener('install', function(event) {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Caching all assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(function() {
        console.log('[SW] All assets cached successfully!');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT - Clean old caches
// ============================================
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) {
              return name !== CACHE_NAME;
            })
            .map(function(name) {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - Network First with Cache Fallback
// ============================================
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip browser-sync and hot-reload requests
  if (event.request.url.includes('browser-sync') || 
      event.request.url.includes('hot-update')) {
    return;
  }
  
  // Skip ad scripts - don't cache them
  if (event.request.url.includes('ads.halalspark.co.uk')) {
    return;
  }
  
  // Skip flag CDN and map CDN - let browser handle
  if (event.request.url.includes('flagcdn.com') || 
      event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then(function(networkResponse) {
        // Cache the fresh response
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(function() {
        // Network failed, try cache
        return caches.match(event.request)
          .then(function(cachedResponse) {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If request is for a page, return index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/geo-games/index.html');
            }
            
            // Return error response
            return new Response('Offline - Resource not cached', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ============================================
// MESSAGE EVENT - Handle skipWaiting and updates
// ============================================
self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});