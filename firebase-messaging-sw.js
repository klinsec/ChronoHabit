
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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  
  // Prevent duplicate notifications if Firebase SDK already handled it
  if (payload.notification) {
      return; 
  }

  const notificationTitle = payload.data?.title || 'ChronoHabit';
  const notificationOptions = {
    body: payload.data?.body || 'Tienes una nueva notificación',
    icon: './icon-192.png',
    data: payload.data, // Pass data along
    tag: 'chronohabit-notification', // Replace existing notifications with same tag
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Add click listener here too, in case this SW handles the interaction
self.addEventListener('notificationclick', function(event) {
  console.log('[Firebase SW] Notification click received.');
  event.notification.close();

  const targetUrl = 'https://klinsec.github.io/ChronoHabit/';

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true 
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.startsWith(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
