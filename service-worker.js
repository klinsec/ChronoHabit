const CACHE_NAME = 'chronohabit-v4'; // Increment version to force update
const urlsToCache = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './manifest.json',
  './utils/helpers.js',
  './context/TimeTrackerContext.js',
  './components/BottomNav.js',
  './components/Icons.js',
  './components/views/TimerView.js',
  './components/views/HistoryView.js',
  './components/views/StatsView.js',
  './components/modals/TaskModal.js',
  './components/modals/EntryModal.js',
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
        const cachePromises = urlsToCache.map(urlToCache => {
          return fetch(urlToCache, { mode: 'no-cors' })
            .then(response => {
                if(response.type === 'opaque' || response.ok) {
                    return cache.put(urlToCache, response);
                }
                return Promise.reject('Response not ok');
            })
            .catch(err => {
              console.warn(`Could not cache ${urlToCache}:`, err);
            });
        });
        return Promise.all(cachePromises);
      })
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
        ).catch(() => {
            // Fallback for failed fetch (e.g. offline)
            // You can return a custom offline page here if you have one
        })
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