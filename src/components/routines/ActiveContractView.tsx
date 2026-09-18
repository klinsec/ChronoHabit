import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';
import { SwipeableCommitment } from './SwipeableCommitment';

export const ActiveContractView: React.FC<{
    contract: any;
    onStatusChange: (id: string, status: CommitmentStatus) => void;
    onNext: () => void;
    onReset: () => void;
    onComplete: () => void;
    onCompleteDay: () => void;
    currentDayIndex: number;
}> = ({ contract, onStatusChange, onNext, onReset, onComplete, onCompleteDay, currentDayIndex }) => {
    
    // Logic to calculate next active day label
    const nextDayLabel = useMemo(() => {
        if (!contract.allowedDays || contract.allowedDays.length === 7) return "MAÑANA";
        
        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
        const todayIndex = currentDayIndex;
        
        for (let i = 1; i <= 7; i++) {
            const nextIndex = (todayIndex + i) % 7;
            if (contract.allowedDays.includes(nextIndex)) {
                if (i === 1) return "MAÑANA";
                return days[nextIndex];
            }
        }
        return "MAÑANA";
    }, [contract.allowedDays, currentDayIndex]);

    // Manually Completed Day
    if (contract.dailyCompleted) {
        return (
            <div className="flex flex-col h-full mt-8 items-center p-6 space-y-6 overflow-y-auto animate-in fade-in duration-500">
                <div className="text-center">
                    <div className="bg-gray-800 p-6 rounded-full border border-green-500/30 shadow-lg shadow-green-900/20 inline-block mb-4">
                        <span className="text-4xl">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Rutina Completada!</h2>
                    <p className="text-gray-400">
                        Has terminado tus innegociables de hoy. 
                        ¡Nos vemos en tu próxima sesión!
                    </p>
                </div>

                <div className="w-full max-w-xs bg-surface p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Próximo</p>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xl text-white">
                            {`Día ${contract.dayInPhase + 1}`} 
                            <span className="text-sm text-gray-500"> / {contract.currentPhase}</span>
                        </span>
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">{nextDayLabel}</span>
                    </div>
                </div>

                {/* List of Commitments Preview (Read Only) */}
                <div className="w-full max-w-sm text-left space-y-2 bg-surface/30 p-4 rounded-xl border border-gray-800 opacity-60">
                    <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-2">Resumen de hoy</p>
                    {contract.commitments.map((c: any) => (
                        <div key={c.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-center border border-gray-700">
                            <span className="text-gray-300 font-medium text-sm">{c.title}</span>
                            <div className="text-xs">
                                {c.status === 'completed' && <span className="text-green-500">✔</span>}
                                {c.status === 'failed' && <span className="text-red-500">✘</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => {
                        if(confirm("Si cancelas la rutina perderás todo el progreso. ¿Seguro que quieres continuar?")) {
                            onReset(); 
                        }
                    }}
                    className="text-xs text-gray-500 hover:text-white underline mt-4"
                >
                    Cancelar y reconfigurar
                </button>
            </div>
        );
    }

    const allResolved = contract.commitments.every((c: any) => c.status !== 'pending');
    const allCompleted = contract.commitments.every((c: any) => c.status === 'completed');
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;

    // Check Rest Day
    const todayDay = currentDayIndex;
    const isRestDay = contract.allowedDays && !contract.allowedDays.includes(todayDay);

    if (isRestDay) {
        return (
            <div className="flex flex-col h-full mt-8 items-center justify-center text-center p-6 space-y-6">
                <div className="bg-gray-800 p-6 rounded-full">
                    <span className="text-4xl">😴</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Día de Descanso</h2>
                    <p className="text-gray-400">Hoy no está marcado en tu rutina. ¡Relájate y recarga energías!</p>
                </div>
                <div className="w-full max-w-xs bg-surface p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Progreso Actual</p>
                    <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-xl">{contract.dayInPhase} <span className="text-sm text-gray-500">/ {contract.currentPhase} días</span></span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                        <div className="bg-gray-600 h-full" style={{ width: `${phaseProgress}%` }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full mt-8">
            {/* Header / Progress */}
            <div className="bg-surface p-4 rounded-2xl mb-6 shadow-lg border border-gray-800 relative">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest">Contrato Actual</p>
                        <h2 className="text-3xl font-bold text-white flex items-baseline gap-1">
                            {contract.currentPhase} <span className="text-sm font-normal text-gray-500">Días</span>
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Día</p>
                        <p className="text-xl font-mono text-primary">{contract.dayInPhase}<span className="text-gray-600">/{contract.currentPhase}</span></p>
                    </div>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500" style={{ width: `${phaseProgress}%` }}></div>
                </div>
            </div>

            {/* Commitments List */}
            <div className="flex-grow space-y-3 mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Tus Innegociables de Hoy</h3>
                {contract.commitments.map((c: any) => (
                    <SwipeableCommitment 
                        key={c.id} 
                        commitment={c} 
                        onChangeStatus={onStatusChange}
                    />
                ))}
            </div>

            {/* Actions Footer */}
            <div className="mt-4">
                {allResolved ? (
                    isPhaseDone ? (
                        // Case A: Last Day of Phase (Show Summary Card)
                        <div className={`p-4 rounded-xl border shadow-2xl animate-in slide-in-from-bottom-2 space-y-3 bg-surface ${allCompleted ? 'border-green-500' : 'border-yellow-600'}`}>
                            <p className={`text-center font-bold ${allCompleted ? 'text-green-400' : 'text-yellow-500'}`}>
                                {allCompleted ? '¡Contrato Perfecto!' : 'Contrato Finalizado'}
                            </p>
                            <button onClick={onNext} className="w-full bg-primary text-bkg font-bold py-3 rounded-lg shadow-lg">
                                Siguiente Contrato (Refinar)
                            </button>
                            <button onClick={onComplete} className="w-full bg-gray-700 text-white font-bold py-2 rounded-lg text-sm">
                                Finalizar y Volver al Menú
                            </button>
                        </div>
                    ) : (
                        // Case B: Intermediate Day Completed (Show Button to Finish Day)
                        <div className="animate-in slide-in-from-bottom-2 flex justify-center">
                            <button 
                                onClick={onCompleteDay}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg border border-green-400/50 flex items-center justify-center gap-2"
                            >
                                <CheckCircleIcon />
                                <span>Finalizar Día</span>
                            </button>
                        </div>
                    )
                ) : (
                    // Case C: Items Pending (Show Break/Reset button only)
                    <div className="flex justify-center mt-2">
                        <button 
                            onClick={() => {
                                if (confirm("¿Seguro que quieres romper el contrato? Volverás al inicio.")) {
                                    onReset();
                                }
                            }}
                            className="text-xs text-red-900 hover:text-red-500 font-bold bg-black/50 px-4 py-2 rounded-full border border-red-900/30 transition-colors"
                        >
                            Romper Contrato (Reiniciar)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

