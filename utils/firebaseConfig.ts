
// @ts-ignore
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
// @ts-ignore
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

let app: any;
let messaging: Messaging | null = null;
let db: any = null;

try {
    app = initializeApp(firebaseConfig);
    try {
        db = getDatabase(app);
    } catch (e) {
        console.error("DB Connect error", e);
    }
    try { getAnalytics(app); } catch (e) {}
    try { messaging = getMessaging(app); } catch (e) {}
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export const requestFcmToken = async (userId?: string): Promise<string | null> => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // FIX: Use existing registration
            const swRegistration = await navigator.serviceWorker.ready;

            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });
            
            console.log("FCM Token Generated:", token);
            
            if (db && userId) {
                await set(ref(db, 'tokens_notificaciones/' + userId), {
                    token: token,
                    updatedAt: Date.now(),
                    ua: navigator.userAgent
                });
            }
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

export const syncUserScore = async (userProfile: any, score: number) => {
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

export const subscribeToLeaderboard = (onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!db) {
        if(onData) onData([]);
        return () => {};
    }
    try {
        const q = query(ref(db, 'leaderboard'), orderByChild('points'), limitToLast(50));
        return onValue(q, (snapshot) => {
            const data: any[] = [];
            snapshot.forEach(child => data.push(child.val()));
            onData(data.reverse());
        }, onError);
    } catch (e) {
        if(onError) onError(e);
        return () => {};
    }
};
