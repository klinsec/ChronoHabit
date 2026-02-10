
// --- ALTERNATIVA NATIVA (SIN FIREBASE) ---

// 1. Notificaciones Nativas del Navegador
export const requestFcmToken = async () => {
    if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones de escritorio');
        return null;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permiso de notificaciones concedido localmente.');
            // Enviar una notificación de prueba inmediata
            new Notification("ChronoHabit", {
                body: "¡Notificaciones activadas! Te avisaremos por aquí.",
                icon: "./icon-192.png"
            });
            return "local-token-granted";
        } else {
            console.warn('Permiso de notificaciones denegado');
            return null;
        }
    } catch (error) {
        console.error("Error solicitando notificaciones:", error);
        return null;
    }
};

// Como no usamos Cloud Messaging, este listener no hace nada, pero lo mantenemos
// para no romper el código que lo llama en el Contexto.
export const onMessageListener = () => {
    return new Promise((resolve) => {
        // Podríamos usar esto para eventos internos si fuera necesario
    });
};

// --- 2. Leaderboard Simulado (Local Storage) ---

// Generamos nombres aleatorios para "competidores"
const botNames = ["ChronosMaster", "TimeWizard", "HabitHero", "FocusNinja", "DailyGrind", "SpeedRunner", "ZenMaster", "ProductivityPro"];

const getBots = () => {
    const stored = localStorage.getItem('leaderboard_bots');
    if (stored) return JSON.parse(stored);

    // Generar bots iniciales con puntuaciones aleatorias
    const bots = botNames.map((name, i) => ({
        id: `bot_${i}`,
        username: name,
        points: Math.floor(Math.random() * 500) + 100, // Puntos base
        isBot: true
    }));
    localStorage.setItem('leaderboard_bots', JSON.stringify(bots));
    return bots;
};

export const syncUserScore = async (userProfile, score) => {
    // En modo local, solo guardamos nuestra puntuación en el array local si es necesario
    // Realmente el Contexto ya maneja el perfil de usuario, aquí simulamos que enviamos los datos
    console.log(`Sincronizando puntuación local para ${userProfile.name}: ${score}`);
    
    // Actualizar bots ligeramente para que el ranking se sienta vivo
    const bots = getBots();
    const updatedBots = bots.map(bot => {
        // 30% de probabilidad de que un bot gane puntos
        if (Math.random() > 0.7) {
            return { ...bot, points: bot.points + Math.floor(Math.random() * 50) };
        }
        return bot;
    });
    localStorage.setItem('leaderboard_bots', JSON.stringify(updatedBots));
};

export const getLeaderboardData = async () => {
    // Obtener bots
    const bots = getBots();
    
    // Obtener usuario actual (esto normalmente viene del contexto, pero aquí lo simulamos leyendo localStorage para componer la lista completa)
    const userProfileStr = localStorage.getItem('userProfile');
    const tasksStr = localStorage.getItem('timeEntries'); // Solo para calcular algo real si fuera necesario, pero usaremos el score pasado
    
    let currentUser = null;
    if (userProfileStr) {
        // Necesitamos calcular el score real del usuario para mostrarlo en la tabla mezclada
        // Como esta función es asíncrona y desacoplada, asumimos que syncUserScore ya se llamó o
        // simplemente devolvemos los bots y dejamos que la UI inyecte al usuario (como ya hace RankingView).
        // Para simplificar: devolvemos solo los bots, la UI de React ya añade al usuario actual a la lista.
    }

    // Devolvemos los bots ordenados
    return bots.sort((a, b) => b.points - a.points);
};
