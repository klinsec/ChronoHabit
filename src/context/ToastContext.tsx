import React, { createContext, useContext, useState, ReactNode } from 'react';
import { XMarkIcon } from '@/components/Icons';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <motion.div 
                            key={toast.id} 
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-xl text-sm font-bold pointer-events-auto
                                ${toast.type === 'success' ? 'bg-green-600 text-white' : 
                                  toast.type === 'error' ? 'bg-red-600 text-white' : 
                                  'bg-gray-800 text-white border border-gray-700'}`}
                        >
                            <span>{toast.message}</span>
                            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-white/50 hover:text-white">
                                <XMarkIcon />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
