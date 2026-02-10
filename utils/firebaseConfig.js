
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

// Configuración de Firebase proporcionada
const firebaseConfig = {
  apiKey: "AIzaSyDHmV3KCrZPym4Vep2dlwAbrgOegQAEQ8M",
  authDomain: "chronohabit-486817-2d6f3.firebaseapp.com",
  projectId: "chronohabit-486817-2d6f3",
  storageBucket: "chronohabit-486817-2d6f3.firebasestorage.app",
  messagingSenderId: "818201828266",
  appId: "1:818201828266:web:de6e5d9f452f48554529d3",
  measurementId: "G-CWY1BEGH6V"
};

// Inicializar Firebase
let app;
let messaging;
let analytics;
let db;

try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase App inicializada");

    try {
        db = getFirestore(app);
        console.log("Firestore (Base de datos) activo");
    } catch (e) {
        console.warn("Error iniciando Firestore:", e);
    }

    try {
        analytics = getAnalytics(app);
    } catch (e) {
        // Ignorar errores de analytics (común en bloqueadores)
    }

    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn("Error iniciando Messaging:", e);
    }

} catch (error) {
    console.error("Error CRÍTICO al inicializar Firebase:", error);
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

// --- 2. SISTEMA DE RANKING REAL (FIRESTORE) ---

// Sincronizar puntuación del usuario actual
export const syncUserScore = async (userProfile, score) => {
    if (!db || !userProfile.id) return;

    try {
        // Referencia al documento único del usuario en la colección 'leaderboard'
        const userRef = doc(db, "leaderboard", userProfile.id);
        
        // setDoc con merge: true actualiza campos sin borrar el resto
        await setDoc(userRef, {
            id: userProfile.id,
            username: userProfile.name,
            points: score,
            updatedAt: Date.now()
        }, { merge: true });
        
        // console.log("Puntos sincronizados en Firestore:", score);
    } catch (error) {
        console.error("Error sincronizando ranking en Firestore:", error);
    }
};

// Suscribirse a cambios en tiempo real del ranking
export const subscribeToLeaderboard = (callback) => {
    if (!db) return () => {};

    // Consulta: Top 100 usuarios ordenados por puntos descendente
    const q = query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(100));

    // onSnapshot escucha cambios en tiempo real
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const leaderboardData = [];
        querySnapshot.forEach((doc) => {
            leaderboardData.push(doc.data());
        });
        callback(leaderboardData);
    }, (error) => {
        console.error("Error escuchando ranking:", error);
    });

    return unsubscribe;
};
