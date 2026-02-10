
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDHmV3KCrZPym4Vep2dlwAbrgOegQAEQ8M",
  authDomain: "chronohabit-486817-2d6f3.firebaseapp.com",
  projectId: "chronohabit-486817-2d6f3",
  databaseURL: "https://chronohabit-486817-2d6f3-default-rtdb.firebaseio.com/",
  storageBucket: "chronohabit-486817-2d6f3.firebasestorage.app",
  messagingSenderId: "818201828266",
  appId: "1:818201828266:web:de6e5d9f452f48554529d3",
  measurementId: "G-CWY1BEGH6V"
};

const VAPID_KEY = 'BMnJFazf6Q0gIA20JT0xrCYJImRTctyTvahlKDBUCANbvJl6HMLv2-4Ba81PYuNbiTqrkI4KuPgFGaWTVBlo5ao';

let app;
let messaging;
let db = null;

try {
    app = initializeApp(firebaseConfig);
    
    // Database connection attempt
    try {
        db = getDatabase(app);
    } catch (e) {
        console.error("Standard DB connect failed, trying explicit URL", e);
        try {
            db = getDatabase(app, firebaseConfig.databaseURL);
        } catch (e2) {
            console.error("Critical DB Error:", e2);
        }
    }

    // Analytics (safe fail)
    try { getAnalytics(app); } catch (e) {}

    // Messaging (safe fail)
    try { messaging = getMessaging(app); } catch (e) {}

} catch (error) {
    console.error("Firebase Init Error:", error);
}

// 1. Notificaciones Push
export const requestFcmToken = async (userId) => {
    if (!messaging) {
        console.warn("Messaging not supported/initialized.");
        return null;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            // FIX CRÍTICO: Registrar el SW manualmente con ruta relativa
            // Esto soluciona el error 404 en GitHub Pages (subdirectorios)
            let swRegistration;
            try {
                swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            } catch (swError) {
                console.error("Fallo al registrar SW de notificaciones:", swError);
                // Intentamos continuar sin registro explícito por si acaso
            }

            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });
            
            if (token) {
                console.log("FCM Token:", token);
                // Save to DB
                if (db && userId) {
                    await set(ref(db, 'tokens_notificaciones/' + userId), {
                        token: token,
                        updatedAt: Date.now(),
                        ua: navigator.userAgent
                    });
                }
                return token;
            }
        } else {
            console.warn("Permiso de notificaciones denegado");
        }
    } catch (error) {
        console.error("Error requesting FCM token:", error);
    }
    return null;
};

// 2. Ranking System
export const syncUserScore = async (userProfile, score) => {
    if (!db || !userProfile.id) return;
    try {
        await set(ref(db, 'leaderboard/' + userProfile.id), {
            id: userProfile.id,
            username: userProfile.name,
            points: score,
            updatedAt: Date.now()
        });
    } catch (e) {
        console.debug("Offline or sync error:", e);
    }
};

export const subscribeToLeaderboard = (onData, onError) => {
    if (!db) {
        if(onData) onData([]);
        return () => {};
    }
    try {
        const q = query(ref(db, 'leaderboard'), orderByChild('points'), limitToLast(50));
        return onValue(q, (snapshot) => {
            const data = [];
            snapshot.forEach(child => data.push(child.val()));
            onData(data.reverse());
        }, onError);
    } catch (e) {
        if(onError) onError(e);
        return () => {};
    }
};
