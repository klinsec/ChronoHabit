
// Add Firebase Messaging Service Worker logic
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase para el Service Worker (Segundo plano)
// REEMPLAZA CON TUS DATOS REALES
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Este manejador se activa cuando la app está en SEGUNDO PLANO o CERRADA
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      // Personaliza la notificación aquí
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png'
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (e) {
    console.log("Firebase SW init skipped (config missing)");
}

const CACHE_NAME = 'chronohabit-v1.2.7'; 
const urlsToCache = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './manifest.json',
  './utils/helpers.js',
  './utils/googleDrive.js',
  './utils/firebaseConfig.js',
  './context/TimeTrackerContext.js',
  './components/BottomNav.js',
  './components/Icons.js',
  './components/views/TimerView.js',
  './components/views/HistoryView.js',
  './components/views/StatsView.js',
  './components/views/TasksView.js',
  './components/views/RoutinesView.js',
  './components/modals/TaskModal.js',
  './components/modals/EntryModal.js',
  './components/modals/GoalModal.js',
  './components/modals/SubtaskModal.js',
  './components/modals/SettingsModal.js',
  './components/ErrorBoundary.js',
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
  self.skipWaiting(); 
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          networkResponse => {
            if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
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
  return self.clients.claim();
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
  event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(windowClients => {
          for (let i = 0; i < windowClients.length; i++) {
              const client = windowClients[i];
              if ('focus' in client) {
                  return client.focus();
              }
          }
          if (self.clients.openWindow) {
              return self.clients.openWindow('./');
          }
      })
  );
});
