
const CACHE_NAME = 'chronohabit-v10'; // Incremented version
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
  './components/views/TasksView.js',
  './components/modals/TaskModal.js',
  './components/modals/EntryModal.js',
  './components/modals/GoalModal.js',
  './components/modals/SubtaskModal.js',
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
          return fetch(urlToCache) 
            .then(response => {
                if (response.ok) { 
                    return cache.put(urlToCache, response);
                }
                console.warn(`Request for ${urlToCache} failed with status ${response.status}`);
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
          networkResponse => {
            // Check if we received a valid response before caching
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed:', error);
            // The browser will show its default offline error page.
            throw error;
        });
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
      const { title, options } = event.data;
      self.registration.showNotification(title, options);
  }

  if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
      const { tag } = event.data;
      self.registration.getNotifications({ tag }).then(notifications => {
          notifications.forEach(notification => notification.close());
      });
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'stop-timer') {
      // Send a message to the client to stop the timer
      self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'STOP_TIMER' }));
      });
  } else {
      // Open the app window
      event.waitUntil(
          self.clients.matchAll({ type: 'window' }).then(windowClients => {
              for (let i = 0; i < windowClients.length; i++) {
                  const client = windowClients[i];
                  // Strict equality check against '/' fails for absolute URLs in preview environments
                  // Relaxed check: if it's a focusable client, focus it.
                  if ('focus' in client) {
                      return client.focus();
                  }
              }
              if (self.clients.openWindow) {
                  return self.clients.openWindow('./');
              }
          })
      );
  }
});
