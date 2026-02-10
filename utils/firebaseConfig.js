
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, ref, set, onValue, query, orderByChild, limitToLast } from 'firebase/database';

// Configuración de Firebase
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

// Inicializar Firebase
let app;
let messaging;
let analytics;
let db = null;

try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase App inicializada");

    try {
        // Inicializar Database
        // Al usar gstatic en importmap, getDatabase(app) debería funcionar correctamente
        db = getDatabase(app);
        console.log("Realtime Database conectado.");
    } catch (e) {
        console.error("Error al conectar Database (Standard):", e);
        try {
            // Intento con URL explícita si falla el standard
            db = getDatabase(app, firebaseConfig.databaseURL);
            console.log("Realtime Database conectado (URL Explícita).");
        } catch (e2) {
            console.error("Error CRÍTICO: No se pudo conectar a Realtime Database.", e2);
        }
    }

    try {
        analytics = getAnalytics(app);
    } catch (e) {
        // Analytics puede fallar por bloqueadores
    }

    try {
        messaging = getMessaging(app);
    } catch (e) {
        // Messaging puede fallar en entorno no seguro
    }

} catch (error) {
    console.error("Error CRÍTICO al inicializar Firebase App:", error);
}

// 1. Notificaciones
export const requestFcmToken = async () => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const token = await getToken(messaging);
                if (token) return token;
            } catch (tokenError) {
                console.warn("No se pudo obtener token FCM:", tokenError);
            }
        }
        return null;
    } catch (error) {
        console.error("Error solicitando token:", error);
        return null;
    }
};

export const onMessageListener = () => {
    if (!messaging) return new Promise(() => {});
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => resolve(payload));
    });
};

// --- 2. SISTEMA DE RANKING REALTIME DATABASE ---

// Sincronizar puntuación del usuario actual
export const syncUserScore = async (userProfile, score) => {
    if (!db) return; 
    if (!userProfile.id) return;

    try {
        const userRef = ref(db, 'leaderboard/' + userProfile.id);
        await set(userRef, {
            id: userProfile.id,
            username: userProfile.name,
            points: score,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.debug("Sync error (posiblemente offline):", error);
    }
};

// Suscribirse a cambios en tiempo real del ranking
export const subscribeToLeaderboard = (onData, onError) => {
    if (!db) {
        console.warn("Base de datos no disponible. Ranking desactivado.");
        if(onData) onData([]); 
        return () => {};
    }

    try {
        const leaderboardRef = ref(db, 'leaderboard');
        const q = query(leaderboardRef, orderByChild('points'), limitToLast(100));

        const unsubscribe = onValue(q, (snapshot) => {
            const leaderboardData = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    leaderboardData.push(childSnapshot.val());
                });
            }
            leaderboardData.reverse();
            onData(leaderboardData);
        }, (error) => {
            console.error("Error escuchando ranking:", error);
            if (onError) onError(error);
        });

        return unsubscribe;
    } catch (e) {
        console.error("Excepción al crear query RTDB:", e);
        if (onError) onError(e);
        return () => {};
    }
};
