
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

// Updated VAPID Key
const VAPID_KEY = 'BIy4MCnijbKGk82g6RT8ETcjHKO7Vbvwt9obBaLEwsekAWmXemCmSOQNNENZ4R_FRSgdXw06CUwrRij8ICRcSr4';

let app: any;
let messaging: Messaging | null = null;
let db: any = null;
let auth: any = null;
const provider = new GoogleAuthProvider();

// NUEVAS RUTAS SEGÚN TU CONFIGURACIÓN
const USER_DATA_PATH = 'configuracion_privada';
const LEADERBOARD_PATH = 'ranking_mensual';
const FRIEND_REQUESTS_PATH = 'solicitudes_amistad';
const FRIENDS_PATH = 'amigos';

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

// --- FRIENDS & REQUESTS ---

export const sendFriendRequest = async (fromUserId: string, fromUserName: string, fromUserPhoto: string, toUserId: string) => {
    if (!db || !fromUserId || !toUserId) return;
    try {
        await set(ref(db, `${FRIEND_REQUESTS_PATH}/${toUserId}/${fromUserId}`), {
            fromName: fromUserName,
            fromPhoto: fromUserPhoto,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error("Error sending friend request:", e);
    }
};

export const acceptFriendRequest = async (userId: string, userName: string, userPhoto: string, friendId: string, friendName: string, friendPhoto: string) => {
    if (!db || !userId || !friendId) return;
    try {
        // Add to user's friends
        await set(ref(db, `${FRIENDS_PATH}/${userId}/${friendId}`), {
            name: friendName,
            photo: friendPhoto,
            addedAt: Date.now()
        });
        // Add to friend's friends
        await set(ref(db, `${FRIENDS_PATH}/${friendId}/${userId}`), {
            name: userName,
            photo: userPhoto,
            addedAt: Date.now()
        });
        // Remove request
        await set(ref(db, `${FRIEND_REQUESTS_PATH}/${userId}/${friendId}`), null);
    } catch (e) {
        console.error("Error accepting friend request:", e);
    }
};

export const rejectFriendRequest = async (userId: string, friendId: string) => {
    if (!db || !userId || !friendId) return;
    try {
        await set(ref(db, `${FRIEND_REQUESTS_PATH}/${userId}/${friendId}`), null);
    } catch (e) {
        console.error("Error rejecting friend request:", e);
    }
};

export const removeFriend = async (userId: string, friendId: string) => {
    if (!db || !userId || !friendId) return;
    try {
        await set(ref(db, `${FRIENDS_PATH}/${userId}/${friendId}`), null);
        await set(ref(db, `${FRIENDS_PATH}/${friendId}/${userId}`), null);
    } catch (e) {
        console.error("Error removing friend:", e);
    }
};

export const subscribeToFriendRequests = (userId: string, onData: (requests: any[]) => void) => {
    if (!db || !userId) return () => {};
    const dbRef = ref(db, `${FRIEND_REQUESTS_PATH}/${userId}`);
    return onValue(dbRef, (snapshot) => {
        const requests: any[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                requests.push({
                    id: child.key,
                    ...child.val()
                });
            });
        }
        onData(requests);
    });
};

export const subscribeToFriends = (userId: string, onData: (friends: string[]) => void) => {
    if (!db || !userId) return () => {};
    const dbRef = ref(db, `${FRIENDS_PATH}/${userId}`);
    return onValue(dbRef, (snapshot) => {
        const friends: string[] = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                friends.push(child.key as string);
            });
        }
        onData(friends);
    });
};

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

export const getUserData = async (userId: string) => {
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

// --- NOTIFICATIONS ---
export const requestFcmToken = async (userId?: string): Promise<string | null> => {
    if (!messaging) {
        alert("Firebase Messaging no se ha inicializado correctamente.");
        return null;
    }

    // 1. Check if permission is already blocked
    if (Notification.permission === 'denied') {
        alert("Las notificaciones están bloqueadas en tu navegador. Por favor, habilítalas en la configuración del sitio (candado junto a la URL).");
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            
            // USE EXISTING REGISTRATION (service-worker.js) INSTEAD OF REGISTERING NEW ONE
            let swRegistration = await navigator.serviceWorker.getRegistration();
            
            if (!swRegistration) {
                console.warn("No Service Worker registered. Notifications might not work.");
                return null;
            }

            try {
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
            } catch (tokenError: any) {
                console.error("GetToken Failed:", tokenError);
                if (tokenError.code === 'messaging/permission-blocked' || tokenError.message?.includes('PERMISSION_DENIED')) {
                    throw new Error("Fallo de autenticación (VAPID) o permiso bloqueado. Verifica que la Clave VAPID coincida con el proyecto Firebase.");
                }
                throw tokenError;
            }
        } else {
            alert("Permiso denegado. No podremos enviarte notificaciones.");
        }
        return null;
    } catch (error: any) {
        console.error("An error occurred while retrieving token. ", error);
        alert("Error técnico: " + error.message);
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);
        callback(payload);
    });
};

// --- RANKING OPTIMIZADO ---
export const syncUserScore = async (userProfile: any, score: number, monthKey: string) => {
    if (!db || !userProfile.uid || !monthKey) return;
    try {
        // Escritura directa al nuevo path 'ranking_mensual/{monthKey}/{userId}'
        await set(ref(db, `${LEADERBOARD_PATH}/${monthKey}/${userProfile.uid}`), {
            nombre: userProfile.displayName || 'Anónimo', 
            puntos: score,
            foto: userProfile.photoURL || '',
            ultimaActualizacion: Date.now()
        });
    } catch (e) {
        console.debug("Offline or sync error:", e);
    }
};

export const subscribeToLeaderboard = (monthKey: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!db || !monthKey) {
        if(onData) onData([]);
        return () => {};
    }
    try {
        const dbRef = ref(db, `${LEADERBOARD_PATH}/${monthKey}`);
        // Consulta optimizada: Ordenar por puntos y traer solo los últimos 50 (los más altos)
        const q = query(dbRef, orderByChild('puntos'), limitToLast(50));

        return onValue(q, (snapshot) => {
            const data: any[] = [];
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    const val = child.val();
                    // Mapeo de campos (BD -> App)
                    data.push({ 
                        id: child.key,
                        username: val.nombre || 'Anónimo',
                        points: val.puntos || 0,
                        photo: val.foto || null
                    });
                });
            }
            // Firebase devuelve ascendente (menor a mayor), invertimos para ranking (mayor a menor)
            onData(data.reverse());
        }, onError);
    } catch (e) {
        if(onError) onError(e);
        return () => {};
    }
};
