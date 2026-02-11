
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
    try {
        db = getDatabase(app);
    } catch (e) {
        console.error("DB Connect error", e);
        try {
            db = getDatabase(app, firebaseConfig.databaseURL);
        } catch (e2) {}
    }
    try { getAnalytics(app); } catch (e) {}
    try { messaging = getMessaging(app); } catch (e) {
        console.error("Firebase Messaging failed to init (likely non-https or private mode):", e);
    }
} catch (error) {
    console.error("Firebase Init Error:", error);
}

// 1. Notificaciones Push
export const requestFcmToken = async (userId) => {
    if (!messaging) {
        console.error("Messaging not initialized.");
        return null;
    }
    
    try {
        console.log("Requesting notification permission...");
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log("Permission granted. Getting Service Worker...");
            
            // Try to get existing registration or wait for ready
            let swRegistration = await navigator.serviceWorker.getRegistration();
            if (!swRegistration) {
                console.log("No SW registration found, waiting for ready...");
                swRegistration = await navigator.serviceWorker.ready;
            }

            if (!swRegistration) {
                 throw new Error("Service Worker not found.");
            }

            console.log("Getting token from Firebase...");
            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });
            
            if (token) {
                console.log("FCM Token success:", token);
                if (db && userId) {
                    // Update user token in DB with correct User ID
                    await set(ref(db, 'tokens_notificaciones/' + userId), {
                        token: token,
                        updatedAt: Date.now(),
                        ua: navigator.userAgent
                    });
                } else {
                    console.warn("No user ID provided to save token.");
                }
                return token;
            }
        } else {
            console.warn("Permission denied.");
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
