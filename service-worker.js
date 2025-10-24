
const CACHE_NAME = 'chronohabit-v3'; // Increment version to force update
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './manifest.json',
  './utils/helpers.ts',
  './context/TimeTrackerContext.tsx',
  './components/BottomNav.tsx',
  './components/Icons.tsx',
  './components/views/TimerView.tsx',
  './components/views/HistoryView.tsx',
  './components/views/StatsView.tsx',
  './components/modals/TaskModal.tsx',
  './components/modals/EntryModal.tsx',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/recharts@^3.3.0',
  'https://aistudiocdn.com/react@^19.2.0/',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files');
        return Promise.all(
          urlsToCache.map(url => {
            // Create requests for each URL. For external URLs, use no-cors mode.
            const request = new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'same-origin' });
            return cache.add(request);
          })
        );
      })
      .catch(err => console.error('Cache addAll failed:', err))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, go to network
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || (response.status !== 200 && response.type !== 'opaque')) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});