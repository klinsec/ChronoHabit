
// --- 1. Firebase Cloud Messaging Init ---
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDHmV3KCrZPym4Vep2dlwAbrgOegQAEQ8M",
  authDomain: "chronohabit-486817-2d6f3.firebaseapp.com",
  projectId: "chronohabit-486817-2d6f3",
  storageBucket: "chronohabit-486817-2d6f3.firebasestorage.app",
  messagingSenderId: "818201828266",
  appId: "1:818201828266:web:de6e5d9f452f48554529d3"
});

const messaging = firebase.messaging();

// --- 2. App Caching Logic ---
const CACHE_NAME = 'chronohabit-v1.4.12'; 
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
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        const cachePromises = urlsToCache.map(urlToCache => {
          return fetch(new Request(urlToCache, { cache: 'reload' })) 
            .then(response => {
                if (response.ok) return cache.put(urlToCache, response);
                console.warn('Failed to cache:', urlToCache, response.status);
            })
            .catch(err => console.warn(`Could not cache ${urlToCache}:`, err));
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request).then(
          networkResponse => {
            if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque') && event.request.method === 'GET' && event.request.url.startsWith('http')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          }
        ).catch(error => { 
            console.log('Fetch error:', error);
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
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  event.notification.close();

  const targetUrl = 'https://klinsec.github.io/ChronoHabit/';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true 
    }).then(function(windowClients) {
      // 1. Check if app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // Match loosely to allow dev environments or specific paths
        if (client.url.includes('ChronoHabit') && 'focus' in client) {
          return client.focus();
        }
      }
      // 2. If not open, open a new window with the specific URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
