
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
  
  // Prevent duplicate notifications:
  // If the payload contains a 'notification' property, the Firebase SDK 
  // will automatically show a notification. We should NOT show another one.
  if (payload.notification) {
      return; 
  }

  // Only show manual notification for Data messages (no notification field)
  const notificationTitle = payload.data?.title || 'ChronoHabit';
  const notificationOptions = {
    body: payload.data?.body || 'Tienes una nueva notificación',
    icon: './icon-192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
