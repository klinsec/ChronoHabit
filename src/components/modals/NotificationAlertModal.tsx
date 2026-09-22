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
                
                // Do NOT clear here, so the native alarm keeps playing!
                // It will be cleared when the user taps "Entendido"
                
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

    const [currentTime, setCurrentTime] = useState<string>('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setCurrentTime(`${hours}:${minutes}`);
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    const dismissAlert = async () => {
        setAlertData(null);
        if (Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.removeAllDeliveredNotifications();
            } catch (e) {
                console.error("Error clearing notifications:", e);
            }
        }
    };

    if (!alertData) return null;

    const isAlarm = alertData.title.toLowerCase().includes('impulso') || alertData.title.toLowerCase().includes('minutos');

    if (isAlarm) {
        return (
            <AnimatePresence>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-black text-white overflow-hidden"
                >
                    {/* Background Image / Video Placeholder */}
                    <div className="absolute inset-0 z-0">
                        {/* 
                          Aquí se mostrará el vídeo de fondo en el futuro.
                          Actualmente usamos la imagen de prueba y se escalará a pantalla completa (1080x1920p).
                        */}
                        <img src="/assets/alarm-bg.webp" className="w-full h-full object-cover opacity-60" alt="Alarm Background" />
                        {/* <video src="/assets/alarm-video.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover opacity-60" /> */}
                        
                        {/* Viñeta/Degradado oscuro para que el texto resalte siempre */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"></div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center w-full h-full justify-between py-24 px-6">
                        {/* Top: Time and Text */}
                        <div className="flex flex-col items-center mt-12 w-full">
                            <motion.h1 
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-7xl font-light tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                            >
                                {currentTime}
                            </motion.h1>
                            
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="mt-8 flex flex-col items-center"
                            >
                                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-center drop-shadow-[0_0_15px_rgba(34,211,238,0.6)] uppercase tracking-wide">
                                    {alertData.title}
                                </h2>
                                <p className="text-xl text-gray-300 mt-3 text-center px-4 font-medium">
                                    {alertData.body}
                                </p>
                            </motion.div>
                        </div>

                        {/* Bottom: Glow Button */}
                        <motion.div 
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="w-full max-w-xs mb-8"
                        >
                            <button 
                                onClick={dismissAlert}
                                className="w-full bg-black/40 backdrop-blur-md border-[3px] border-cyan-400 text-cyan-400 font-bold text-2xl py-5 px-8 rounded-full uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.7),inset_0_0_15px_rgba(34,211,238,0.4)]"
                            >
                                Aceptar
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

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
                        onClick={dismissAlert}
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
