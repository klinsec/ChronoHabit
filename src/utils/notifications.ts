import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Helper to generate a numeric ID from a string tag
const generateIdFromTag = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = ((hash << 5) - hash) + tag.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash);
};

export const setupNotificationChannels = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            await LocalNotifications.createChannel({
                id: 'chronohabit-alarm-v2',
                name: 'Alarmas de Rutinas',
                description: 'Alarmas que suenan fuerte para tus rutinas importantes',
                importance: 5,
                visibility: 1,
                vibration: true,
                sound: 'alarm' // WITHOUT extension!
            });
            await LocalNotifications.createChannel({
                id: 'chronohabit-default',
                name: 'Notificaciones normales',
                description: 'Avisos estA!ndar de la aplicaciA3n',
                importance: 3,
                visibility: 1,
                vibration: true
            });
        } catch (e) {
            console.error("Error creating notification channels:", e);
        }
    }
};

export const scheduleLocalNotification = async (title: string, body: string, timestampMs: number, tag: string = 'chronohabit-scheduled', isAlarm: boolean = false) => {
    const delay = timestampMs - Date.now();
    if (delay <= 0) return; // Time already passed

    if (Capacitor.isNativePlatform()) {
        try {
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display !== 'granted') return;

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: generateIdFromTag(tag),
                        schedule: { at: new Date(timestampMs), allowWhileIdle: true },
                        channelId: isAlarm ? 'chronohabit-alarm-v2' : 'chronohabit-default',
                        sound: isAlarm ? 'alarm' : undefined
                    }
                ]
            });
            console.log(`Scheduled Capacitor native notification (${tag}) for`, new Date(timestampMs), isAlarm ? 'as ALARM' : '');
        } catch (err) {
            console.error("Capacitor notification error:", err);
        }
        return;
    }

    // Web fallback
    if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            console.warn("No service worker registered for notifications.");
            return;
        }

        // Check if Notification Triggers API is supported (Android Chrome/Edge)
        if ('showTrigger' in Notification.prototype) {
            // @ts-ignore - Experimental API
            await registration.showNotification(title, {
                body: body,
                icon: './icon-192.png',
                // @ts-ignore
                showTrigger: new TimestampTrigger(timestampMs),
                tag: tag
            });
            console.log(`Scheduled web native notification (${tag}) for`, new Date(timestampMs));
        } else {
            // Fallback: Local timeout if app remains open in background
            setTimeout(() => {
                registration.showNotification(title, {
                    body: body,
                    icon: './icon-192.png',
                    tag: tag
                });
            }, delay);
            console.log(`Scheduled web fallback notification (${tag}) for`, new Date(timestampMs));
        }
    } catch (err) {
        console.error("Error scheduling web notification:", err);
    }
};

export const showImmediateNotification = async (title: string, body: string) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display !== 'granted') return;
            
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: Math.floor(Math.random() * 1000000),
                        schedule: { at: new Date(Date.now() + 1000) } // immediate
                    }
                ]
            });
        } catch (err) {
            console.error("Capacitor notification error:", err);
        }
        return;
    }

    if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            registration.showNotification(title, {
                body,
                icon: '/ChronoHabit/icon-192.png'
            });
        }
    }
};

export const requestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            await LocalNotifications.requestPermissions();
        } catch (err) {
            console.error("Capacitor perm error:", err);
        }
    } else {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }
};
