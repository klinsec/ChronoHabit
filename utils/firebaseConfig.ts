
// @ts-ignore
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
// @ts-ignore
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast, get, child } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

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
let auth: any = null;
const provider = new GoogleAuthProvider();

// Paths
const USER_DATA_PATH = 'usuarios_data';
const LEADERBOARD_PATH = 'leaderboard';

try {
    app = initializeApp(firebaseConfig);
    try {
        db = getDatabase(app);
        auth = getAuth(app);
    } catch (e) {
        console.error("DB/Auth Connect error", e);
    }
    try { getAnalytics(app); } catch (e) {}
    try { messaging = getMessaging(app); } catch (e) { console.error("Messaging Init Failed", e); }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// --- AUTH ---
export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Auth not initialized");
    const result = await signInWithPopup(auth, provider);
    return result.user;
};

export const logoutFirebase = async () => {
    if (!auth) return;
    await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
};

// --- DATA SYNC (CLOUD SAVE) ---
export const saveUserData = async (userId: string, data: string) => {
    if (!db || !userId) return;
    try {
        // Clean JSON to avoid serialization errors with Firebase
        // Although data is string, we parse and re-stringify if needed, or just ensure the wrapper object is clean.
        const cleanState = JSON.parse(data);

        await set(ref(db, `${USER_DATA_PATH}/${userId}`), {
            data: JSON.stringify(cleanState), // Saving as string to ensure structure integrity
            updatedAt: new Date().toISOString(),
            device: navigator.userAgent || 'unknown'
        });
    } catch (e) {
        console.error("Error saving user data:", e);
        throw e;
    }
};

export const getUserData = async (userId: string) => {
    if (!db || !userId) return null;
    try {
        const snapshot = await get(child(ref(db), `${USER_DATA_PATH}/${userId}`));
        if (snapshot.exists()) {
            const val = snapshot.val();
            // Handle both legacy (direct object) and new (stringified data field) formats
            if (val.data && typeof val.data === 'string') {
                return { ...val, data: val.data };
            }
            return val;
        } else {
            return null;
        }
    } catch (e) {
        console.error("Error getting user data:", e);
        return null;
    }
};

// --- NOTIFICATIONS ---
export const requestFcmToken = async (userId?: string): Promise<string | null> => {
    if (!messaging) {
        console.error("Messaging not supported or failed to init");
        return null;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            let swRegistration = await navigator.serviceWorker.getRegistration();
            if (!swRegistration) {
                 swRegistration = await navigator.serviceWorker.ready;
            }
            
            if(!swRegistration) throw new Error("No Service Worker found.");

            const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swRegistration
            });
            
            if (db && userId) {
                await set(ref(db, 'tokens_notificaciones/' + userId), {
                    token: token,
                    updatedAt: Date.now(),
                    ua: navigator.userAgent
                });
            }
            return token;
        } else {
            return null;
        }
    } catch (error) {
        console.error("An error occurred while retrieving token. ", error);
        return null;
    }
};

// --- RANKING ---
export const syncUserScore = async (userProfile: any, score: number) => {
    if (!db || !userProfile.uid) return;
    try {
        await set(ref(db, `${LEADERBOARD_PATH}/${userProfile.uid}`), {
            id: userProfile.uid,
            username: userProfile.displayName || 'Anónimo',
            points: score,
            puntos: score, // Double write for compatibility
            photo: userProfile.photoURL,
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
        // Fallback: Fetch all and sort client-side to avoid index requirement issues
        const q = ref(db, LEADERBOARD_PATH);
        return onValue(q, (snapshot) => {
            const data: any[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const val = child.val();
                    // normalize points
                    const p = val.points !== undefined ? val.points : (val.puntos !== undefined ? val.puntos : 0);
                    data.push({ ...val, points: p, id: child.key });
                });
            }
            // Sort descending by points
            data.sort((a, b) => b.points - a.points);
            // Limit to top 50 client side
            onData(data.slice(0, 50));
        }, onError);
    } catch (e) {
        if(onError) onError(e);
        return () => {};
    }
};
