
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';

// ¡IMPORTANTE! Reemplaza con tus datos de Firebase Console
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const VAPID_KEY = "TU_VAPID_KEY_AQUI";

let messaging = null;
let db = null;

try {
    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase init failed:", error);
}

export const requestFcmToken = async () => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            console.log("FCM Token:", token);
            return token;
        }
        return null;
    } catch (error) {
        console.error("Error getting token:", error);
        return null;
    }
};

export const onMessageListener = () => {
    if (!messaging) return new Promise(() => {});
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
};

// --- Firestore Leaderboard Logic ---

export const syncUserScore = async (userProfile, score) => {
    if (!db || !userProfile.id) return;
    try {
        await setDoc(doc(db, "leaderboard", userProfile.id), {
            username: userProfile.name,
            points: score,
            lastUpdated: Date.now()
        });
    } catch (e) {
        console.error("Error syncing score:", e);
    }
};

export const getLeaderboardData = async () => {
    if (!db) return [];
    try {
        // Get top 100 to allow finding friends/self easily in reasonably sized app
        const q = query(collection(db, "leaderboard"), orderBy("points", "desc"), limit(100));
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        return data;
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        return [];
    }
};
