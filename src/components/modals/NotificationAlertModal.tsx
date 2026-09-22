import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationAlertModal: React.FC = () => {
    const [alertData, setAlertData] = useState<{ title: string; body: string } | null>(null);

    const checkPendingNotifications = async () => {
        if (!Capacitor.isNativePlatform()) return;
        
        try {
            const delivered = await LocalNotifications.getDeliveredNotifications();
            if (delivered.notifications && delivered.notifications.length > 0) {
                // Grab the first one (most recent usually)
                const notif = delivered.notifications[0];
                setAlertData({ title: notif.title, body: notif.body });
                
                // Clear them so it doesn't pop up again
                await LocalNotifications.removeAllDeliveredNotifications();
                
                if (notif.title.toLowerCase().includes('impulso') || notif.title.toLowerCase().includes('minutos')) {
                    window.dispatchEvent(new CustomEvent('switchTab', { detail: 'routines' }));
                }
            }
        } catch (e) {
            console.error("Error checking notifications:", e);
        }
    };

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // Check on initial load
        checkPendingNotifications();

        // Listen for when app comes back to foreground
        const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                checkPendingNotifications();
            }
        });

        // Listen for when notification is tapped while app is open or closed
        const actionListener = LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
            const title = notificationAction.notification.title;
            setAlertData({
                title: title,
                body: notificationAction.notification.body
            });
            LocalNotifications.removeAllDeliveredNotifications();
            
            if (title.toLowerCase().includes('impulso') || title.toLowerCase().includes('minutos')) {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: 'routines' }));
            }
        });
        
        // Listen for when notification is received while app is already open
        const receiveListener = LocalNotifications.addListener('localNotificationReceived', (notification) => {
            const title = notification.title;
            setAlertData({
                title: title,
                body: notification.body
            });
            LocalNotifications.removeAllDeliveredNotifications();
            
            if (title.toLowerCase().includes('impulso') || title.toLowerCase().includes('minutos')) {
                window.dispatchEvent(new CustomEvent('switchTab', { detail: 'routines' }));
            }
        });

        return () => {
            appStateListener.then(l => l.remove());
            actionListener.then(l => l.remove());
            receiveListener.then(l => l.remove());
        };
    }, []);

    if (!alertData) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-surface border border-primary p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500 animate-pulse"></div>
                    
                    <div className="mx-auto bg-primary/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">{alertData.title}</h2>
                    <p className="text-gray-300 mb-8 text-lg">{alertData.body}</p>
                    
                    <button 
                        onClick={() => setAlertData(null)}
                        className="w-full bg-primary hover:bg-primary-dark text-black font-bold py-3 px-6 rounded-xl transition-transform active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                    >
                        ¡Entendido!
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default NotificationAlertModal;
