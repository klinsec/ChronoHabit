
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast, get, child } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

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
let auth = null;
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

try {
    app = initializeApp(firebaseConfig);
    try {
        db = getDatabase(app);
        auth = getAuth(app);
    } catch (e) {
        console.error("DB/Auth Connect error", e);
    }
    try { getAnalytics(app); } catch (e) {}
    try { messaging = getMessaging(app); } catch (e) {
        console.warn("Firebase Messaging init failed (may be offline or unsupported):", e);
    }
} catch (error) {
    console.error("Firebase Init Error:", error);
}

// 1. Auth Functions
export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Auth Error details:", error);
        throw error;
    }
};

export const logoutFirebase = async () => {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

export const subscribeToAuthChanges = (callback) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
};

// 2. Data Sync (Realtime Database)
// Uses 'set' to OVERWRITE existing data at the user's path.
export const saveUserData = async (userId, data) => {
    if (!db || !userId) return;
    try {
        // This path is unique per user. 'set' overwrites everything at this location.
        await set(ref(db, 'users/' + userId + '/backup'), {
            data: data, // The full JSON string
            updatedAt: Date.now(),
            device: navigator.userAgent
        });
    } catch (e) {
        console.error("Error saving user data:", e);
        throw e;
    }
};

export const getUserData = async (userId) => {
    if (!db || !userId) return null;
    try {
        const snapshot = await get(child(ref(db), 'users/' + userId + '/backup'));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error getting user data:", e);
        return null;
    }
};

// 3. Notificaciones Push
export const requestFcmToken = async (userId) => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            let swRegistration = await navigator.serviceWorker.getRegistration();
            if (!swRegistration) {
                swRegistration = await navigator.serviceWorker.ready;
            }
            if (!swRegistration) throw new Error("Service Worker not found.");

            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });
            
            if (token && db && userId) {
                await set(ref(db, 'tokens_notificaciones/' + userId), {
                    token: token,
                    updatedAt: Date.now(),
                    ua: navigator.userAgent
                });
                return token;
            }
        }
    } catch (error) {
        console.error("Error requesting FCM token:", error);
    }
    return null;
};

// 4. Ranking System
export const syncUserScore = async (user, score) => {
    if (!db || !user || !user.uid) return;
    try {
        await set(ref(db, 'leaderboard/' + user.uid), {
            id: user.uid,
            username: user.displayName || 'Anónimo',
            points: score,
            photo: user.photoURL,
            updatedAt: Date.now()
        });
    } catch (e) {
        console.debug("Error sync score:", e);
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
