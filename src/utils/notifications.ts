export const scheduleLocalNotification = async (title: string, body: string, timestampMs: number) => {
    // Check permission
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
                tag: 'chronohabit-scheduled'
            });
            console.log("Scheduled notification natively for", new Date(timestampMs));
        } else {
            // Fallback: Local timeout if app remains open in background
            const delay = timestampMs - Date.now();
            if (delay > 0) {
                setTimeout(() => {
                    registration.showNotification(title, {
                        body: body,
                        icon: './icon-192.png',
                        tag: 'chronohabit-fallback'
                    });
                }, delay);
                console.log("Scheduled fallback notification for", new Date(timestampMs));
            }
        }
    } catch (err) {
        console.error("Error scheduling notification:", err);
    }
};

export const showImmediateNotification = async (title: string, body: string) => {
    if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            registration.showNotification(title, {
                body,
                icon: './icon-192.png'
            });
        }
    }
};
