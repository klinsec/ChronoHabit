
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

// Updated VAPID Key
const VAPID_KEY = 'BIy4MCnijbKGk82g6RT8ETcjHKO7Vbvwt9obBaLEwsekAWmXemCmSOQNNENZ4R_FRSgdXw06CUwrRij8ICRcSr4';

let app;
let messaging;
let db = null;
let auth = null;
const provider = new GoogleAuthProvider();
provider.addScope('profile');
provider.addScope('email');

// Nuevas rutas
const USER_DATA_PATH = 'configuracion_privada';
const LEADERBOARD_PATH = 'ranking_global';

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
        console.warn("Firebase Messaging init failed:", e);
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

// 2. Data Sync
export const saveUserData = async (userId, data) => {
    if (!db || !userId) return;
    try {
        const cleanState = JSON.parse(data);
        await set(ref(db, `${USER_DATA_PATH}/${userId}`), {
            data: JSON.stringify(cleanState),
            updatedAt: new Date().toISOString(),
            device: navigator.userAgent || 'unknown'
        });
    } catch (e) {
        console.error("Error saving user data:", e);
        throw e;
    }
};

export const getUserData = async (userId) => {
    if (!db || !userId) return null;
    try {
        const snapshot = await get(child(ref(db), `${USER_DATA_PATH}/${userId}`));
        if (snapshot.exists()) {
            const val = snapshot.val();
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

// 3. Notifications
export const requestFcmToken = async (userId) => {
    if (!messaging) {
        alert("El sistema de mensajería no está disponible.");
        return null;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Using relative path './' to ensure it works on GitHub Pages subdirectories
            // This looks for the file in the same directory as the index.html
            const swRegistration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');

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
        } else {
            alert("Permiso denegado. Habilita las notificaciones en tu navegador.");
        }
    } catch (error) {
        console.error("Error requesting FCM token:", error);
        alert("Error técnico al solicitar token: " + error.message);
    }
    return null;
};

// 4. Ranking System
export const syncUserScore = async (user, score) => {
    if (!db || !user || !user.uid) return;
    try {
        await set(ref(db, `${LEADERBOARD_PATH}/${user.uid}`), {
            nombre: user.displayName || 'Anónimo', 
            puntos: score,
            foto: user.photoURL || '',
            ultimaActualizacion: Date.now()
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
        const dbRef = ref(db, LEADERBOARD_PATH);
        // Usamos query para ordenar por servidor
        const q = query(dbRef, orderByChild('puntos'), limitToLast(50));

        return onValue(q, (snapshot) => {
            const data = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const val = child.val();
                    data.push({ 
                        id: child.key, 
                        username: val.nombre || 'Anónimo', 
                        points: val.puntos || 0, 
                        photo: val.foto || null 
                    });
                });
            }
            // Invertir porque Firebase devuelve menor->mayor
            onData(data.reverse());
        }, onError);
    } catch (e) {
        if(onError) onError(e);
        return () => {};
    }
};
