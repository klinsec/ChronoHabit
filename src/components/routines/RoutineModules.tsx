import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { showImmediateNotification, scheduleLocalNotification } from '@/utils/notifications';

const scheduleRoutineAlarm = async (timeStr: string, tag: string, title: string, body: string) => {
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
    if (Notification.permission !== 'granted') return;

    const [h, m] = timeStr.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    
    // If time has already passed today, schedule for tomorrow
    if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
    }
    
    await scheduleLocalNotification(title, body, target.getTime(), tag);
};

export const MorningMomentumModule: React.FC<{ onRemove: () => void }> = ({ onRemove }) => {
    const { addRoutineLog, routineLogs } = useTimeTracker();
    const [checks, setChecks] = useState([false, false, false]);
    const [time, setTime] = useState(() => localStorage.getItem('morningRoutineTime') || '06:00');

    const todayStr = new Date().toLocaleDateString('en-CA');
    const isCompletedToday = routineLogs.some(log => log.moduleId === '202020' && log.date === todayStr);

    useEffect(() => {
        localStorage.setItem('morningRoutineTime', time);
        scheduleRoutineAlarm(
            time, 
            'chronohabit-morning', 
            '¡Impulso Matutino!', 
            '¡Hay que mover el esqueleto! 🏃‍♂️ Empieza tus rutinas ahora.'
        );
    }, [time]);

    const toggleCheck = (index: number) => {
        if (isCompletedToday) return; // Blocked if already completed today

        const newChecks = [...checks];
        newChecks[index] = !newChecks[index];
        setChecks(newChecks);

        // If all 3 are checked right now, award point and lock
        if (newChecks.every(c => c === true)) {
            addRoutineLog('202020', 1);
            setChecks([false, false, false]); // Optional, will be hidden by isCompletedToday anyway
        }
    };

    return (
        <div className="relative bg-surface border border-green-500/30 rounded-xl p-4 shadow-lg overflow-hidden">
            <button onClick={onRemove} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 font-bold px-2 py-1 bg-gray-800 rounded">X</button>
            <div className="flex justify-between items-center mb-3 pr-8">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🌅</span>
                    <h3 className="font-bold text-lg text-green-400">Impulso Matutino</h3>
                </div>
                <input 
                    type="time" 
                    value={time} 
                    onChange={e => setTime(e.target.value)}
                    onClick={() => {
                        if (Notification.permission === 'default') Notification.requestPermission();
                    }}
                    className="bg-gray-900 border border-green-500/50 text-green-400 font-bold text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-green-400" 
                />
            </div>
            <p className="text-sm text-gray-400 mb-4">La rutina perfecta para arrancar el día con energía y atacar tu Sapo directamente.</p>
            
            {isCompletedToday ? (
                <div className="bg-green-900/30 border border-green-500 rounded-xl p-6 text-center">
                    <span className="text-4xl block mb-2">⭐</span>
                    <h4 className="font-bold text-green-400 mb-1">¡Ciclo Completado!</h4>
                    <p className="text-sm text-gray-300">Has ganado 1 punto de disciplina. Vuelve mañana para un nuevo ciclo.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    <div onClick={() => toggleCheck(0)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checks[0] ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checks[0] ? 'border-green-500 bg-green-500' : 'border-gray-500'}`}>
                            {checks[0] && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${checks[0] ? 'text-green-400' : 'text-gray-200'}`}>1. Activar el Cuerpo</p>
                            <p className="text-xs text-gray-500">Haz ejercicio, suda y despeja tu mente.</p>
                        </div>
                    </div>
                    <div onClick={() => toggleCheck(1)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checks[1] ? 'bg-green-900/30 border border-green-500/50' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checks[1] ? 'border-green-500 bg-green-500' : 'border-gray-500'}`}>
                            {checks[1] && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${checks[1] ? 'text-green-400' : 'text-gray-200'}`}>2. Mentalización (5 min)</p>
                            <p className="text-xs text-gray-500">Pequeña reflexión para organizar tus prioridades.</p>
                        </div>
                    </div>
                    <div onClick={() => toggleCheck(2)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checks[2] ? 'bg-green-900/50 border border-green-400' : 'bg-gray-800 hover:bg-gray-700 border border-green-500/30'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checks[2] ? 'border-green-400 bg-green-400' : 'border-gray-500'}`}>
                            {checks[2] ? <span className="text-black text-xs font-bold">✓</span> : <span className="text-xs">🐸</span>}
                        </div>
                        <div>
                            <p className={`font-bold text-sm ${checks[2] ? 'text-green-300' : 'text-green-400'}`}>3. ¡Trágate el Sapo!</p>
                            <p className="text-xs text-gray-500">Empieza con tu tarea principal del día inmediatamente.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ShutdownModule: React.FC<{ onRemove: () => void }> = ({ onRemove }) => {
    const [time, setTime] = useState(() => localStorage.getItem('shutdownRoutineTime') || '19:00');

    useEffect(() => {
        localStorage.setItem('shutdownRoutineTime', time);
        scheduleRoutineAlarm(
            time, 
            'chronohabit-shutdown', 
            '🛑 Ritual de Desconexión', 
            '¡Hora de cerrar! Vacía tu bandeja y desconecta por hoy.'
        );
    }, [time]);

    return (
        <div className="relative bg-surface border border-purple-500/30 rounded-xl p-4 shadow-lg overflow-hidden">
            <button onClick={onRemove} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 font-bold px-2 py-1 bg-gray-800 rounded">X</button>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🌙</span>
                <h3 className="font-bold text-lg text-purple-400">Ritual de Desconexión</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">Establece un límite diario. A la hora indicada recibirás una notificación para cerrar todo y descansar.</p>
            
            <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⏰</span>
                    <input 
                        type="time" 
                        value={time} 
                        onChange={e => setTime(e.target.value)}
                        onClick={() => {
                            if (Notification.permission === 'default') Notification.requestPermission();
                        }}
                        className="bg-gray-900 border border-purple-500 text-white font-bold text-2xl p-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-400" 
                    />
                </div>
                <p className="text-xs text-gray-400 text-center">Notificación programada. Cuando suene, vacía tu bandeja y desconecta.</p>
            </div>
        </div>
    );
};

export const LibraryModal: React.FC<{ onAdd: (id: string) => void, active: string[], onClose: () => void }> = ({ onAdd, active, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-md rounded-2xl p-6 border border-gray-700 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">X</button>
                <h2 className="text-xl font-bold mb-4">Biblioteca de Rutinas</h2>
                <p className="text-sm text-gray-400 mb-6">Activa las rutinas que encajen con tu estilo de vida. No recomendamos más de 2 al mismo tiempo.</p>
                
                <div className="space-y-4">
                    {!active.includes('contract') && (
                        <div className="border border-gray-700 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold">Contrato de Disciplina</h3>
                                <p className="text-xs text-gray-500">1+3+7+10 días de cadena</p>
                            </div>
                            <button onClick={() => onAdd('contract')} className="bg-primary px-3 py-1 rounded text-sm font-bold">Añadir</button>
                        </div>
                    )}
                    {!active.includes('202020') && (
                        <div className="border border-gray-700 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-green-400">Impulso Matutino</h3>
                                <p className="text-xs text-gray-500">Activación + Enfoque + Sapo</p>
                            </div>
                            <button onClick={() => onAdd('202020')} className="bg-green-600 px-3 py-1 rounded text-sm font-bold">Añadir</button>
                        </div>
                    )}
                    {!active.includes('shutdown') && (
                        <div className="border border-gray-700 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-purple-400">Shutdown Ritual</h3>
                                <p className="text-xs text-gray-500">Desconexión laboral</p>
                            </div>
                            <button onClick={() => onAdd('shutdown')} className="bg-purple-600 px-3 py-1 rounded text-sm font-bold">Añadir</button>
                        </div>
                    )}
                    
                    {active.includes('contract') && active.includes('202020') && active.includes('shutdown') && (
                        <p className="text-center text-sm text-gray-500 italic mt-4">Todas las rutinas están activas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
