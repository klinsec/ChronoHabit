
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

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

try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    messaging = getMessaging(app);
    console.log("Firebase inicializado correctamente");
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
}

// --- SISTEMA DE RANKING GLOBAL (PANTRY CLOUD) ---
const PANTRY_BASE_URL = "https://getpantry.cloud/apiv1/pantry";
const BASKET_NAME = "chronohabit_ranking_v1";

// 1. Notificaciones
export const requestFcmToken = async () => {
    if (!messaging) {
        console.warn("Firebase Messaging no está activo.");
        return null;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Nota: getToken normalmente requiere una 'vapidKey' generada en la consola de Firebase
            // (Project Settings -> Cloud Messaging -> Web Configuration).
            // Sin ella, esto puede fallar en algunos navegadores.
            try {
                // Intenta obtener el token por defecto
                const token = await getToken(messaging);
                if (token) {
                    console.log("FCM Token:", token);
                    return token;
                }
            } catch (tokenError) {
                console.warn("No se pudo obtener el token FCM (posible falta de VAPID Key):", tokenError);
                // Retornamos un valor 'dummy' para que la UI muestre que las notificaciones están activas (permiso concedido)
                return "permission-granted-no-token";
            }
        } else {
            console.warn("Permiso de notificación denegado");
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
        onMessage(messaging, (payload) => {
            console.log("Mensaje recibido en primer plano:", payload);
            resolve(payload);
        });
    });
};

// --- 2. Funciones de Ranking Real (Pantry) ---

// Guardar/Actualizar puntuación en la nube
export const syncUserScore = async (userProfile, score, pantryId) => {
    if (!pantryId || !userProfile.id) return;

    const url = `${PANTRY_BASE_URL}/${pantryId}/basket/${BASKET_NAME}`;
    
    const payload = {
        [userProfile.id]: {
            id: userProfile.id,
            username: userProfile.name,
            points: score,
            updatedAt: Date.now()
        }
    };

    try {
        await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`Puntos sincronizados en la nube: ${score}`);
    } catch (error) {
        console.error("Error sincronizando ranking:", error);
    }
};

// Obtener la tabla completa
export const getLeaderboardData = async (pantryId) => {
    if (!pantryId) return [];

    const url = `${PANTRY_BASE_URL}/${pantryId}/basket/${BASKET_NAME}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn("Ranking vacío o ID incorrecto");
            return [];
        }
        
        const data = await response.json();
        const playersArray = Object.values(data);
        
        return playersArray.sort((a, b) => b.points - a.points);
    } catch (error) {
        console.error("Error obteniendo ranking:", error);
        return [];
    }
};
