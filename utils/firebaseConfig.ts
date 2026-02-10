
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// ¡IMPORTANTE! Debes reemplazar esto con la configuración de tu proyecto Firebase
// Ve a Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

// VAPID Key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
const VAPID_KEY = "TU_VAPID_KEY_AQUI";

let messaging: Messaging | null = null;

try {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
} catch (error) {
    console.error("Firebase initialization error (Check config):", error);
}

export const requestFcmToken = async (): Promise<string | null> => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            console.log("FCM Token Generated:", token);
            // Aquí deberías enviar este token a tu Cloud Function o Base de Datos
            // para asociarlo con el usuario y poder enviarle notificaciones luego.
            return token;
        } else {
            console.warn("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
        return null;
    }
};

export const onMessageListener = () => {
    if (!messaging) return new Promise(() => {});
    return new Promise((resolve) => {
        onMessage(messaging!, (payload) => {
            console.log("Foreground message received:", payload);
            resolve(payload);
        });
    });
};
