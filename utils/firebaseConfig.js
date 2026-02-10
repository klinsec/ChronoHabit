
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
    console.log("Firebase App inicializada");

    try {
        analytics = getAnalytics(app);
        console.log("Analytics activo");
    } catch (e) {
        console.warn("Error iniciando Analytics (puede ser bloqueador de anuncios o entorno no soportado):", e);
    }

    try {
        messaging = getMessaging(app);
        console.log("Messaging activo");
    } catch (e) {
        console.warn("Error iniciando Messaging:", e);
    }

} catch (error) {
    console.error("Error CRÍTICO al inicializar Firebase:", error);
}

// --- SISTEMA DE RANKING GLOBAL (PANTRY CLOUD) ---
const PANTRY_BASE_URL = "https://getpantry.cloud/apiv1/pantry";
const BASKET_NAME = "Ranking_ChronoHabit"; // Nombre actualizado para coincidir con tu prueba

// 1. Notificaciones
export const requestFcmToken = async () => {
    if (!messaging) {
        console.warn("Firebase Messaging no está activo.");
        return null;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const token = await getToken(messaging);
                if (token) {
                    console.log("FCM Token:", token);
                    return token;
                }
            } catch (tokenError) {
                console.warn("No se pudo obtener el token FCM:", tokenError);
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
        // IMPORTANTE: Usamos POST para hacer MERGE de los datos. 
        // PUT reemplazaría toda la cesta borrando a otros usuarios.
        await fetch(url, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`Puntos sincronizados en la nube (${score}) para ${userProfile.name}`);
    } catch (error) {
        console.error("Error sincronizando ranking:", error);
    }
};

// Obtener la tabla completa
export const getLeaderboardData = async (pantryId) => {
    if (!pantryId) return [];

    // Añadimos un timestamp para evitar caché agresivo del navegador/API
    const url = `${PANTRY_BASE_URL}/${pantryId}/basket/${BASKET_NAME}?_t=${Date.now()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn("Ranking aún no creado o ID incorrecto (404 es normal al inicio)");
            return [];
        }
        
        const data = await response.json();
        const playersArray = Object.values(data);
        
        // Filtrar datos corruptos si los hubiera y ordenar
        return playersArray
            .filter(p => p && typeof p.points === 'number')
            .sort((a, b) => b.points - a.points);
    } catch (error) {
        console.error("Error obteniendo ranking:", error);
        return [];
    }
};
