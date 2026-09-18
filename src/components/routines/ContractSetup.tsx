import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const ContractSetup: React.FC<{
    commitments: Omit<Commitment, 'id' | 'status'>[];
    setCommitments: React.Dispatch<React.SetStateAction<Omit<Commitment, 'id' | 'status'>[]>>;
    duration: number;
    setDuration: (d: number) => void;
    allowedDays: number[];
    setAllowedDays: React.Dispatch<React.SetStateAction<number[]>>;
    onCancel: () => void;
    onStart: () => void;
    onSaveRoutine: (title: string, commitments: any[], allowedDays: number[]) => void;
    savedRoutines: SavedRoutine[];
    onDeleteRoutine: (id: string) => void;
}> = ({ commitments, setCommitments, duration, setDuration, allowedDays, setAllowedDays, onCancel, onStart, onSaveRoutine, savedRoutines, onDeleteRoutine }) => {
    
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [routineName, setRoutineName] = useState('');

    const addField = () => setCommitments([...commitments, { title: '', time: '' }]);
    const updateField = (index: number, field: 'title' | 'time', value: string) => {
        const newC = [...commitments];
        // @ts-ignore
        newC[index][field] = value;
        setCommitments(newC);
    };
    const removeField = (index: number) => {
        setCommitments(commitments.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!routineName.trim()) return;
        onSaveRoutine(routineName, commitments.filter(c => c.title.trim()), allowedDays);
        setRoutineName('');
        setShowSaveModal(false);
    };

    const toggleDay = (dayIndex: number) => {
        setAllowedDays(prev => {
            if (prev.includes(dayIndex)) {
                if (prev.length === 1) return prev;
                return prev.filter(d => d !== dayIndex);
            }
            return [...prev, dayIndex].sort();
        });
    };

    const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // 0=Sun, 1=Mon...

    return (
        <div className="flex flex-col h-full mt-8 relative">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white">Nuevo Contrato</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-gray-400">Duración (días):</span>
                        <input 
                            type="number" 
                            value={duration} 
                            onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                            className="bg-gray-800 text-white font-bold rounded px-2 py-1 w-16 text-center"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowSaveModal(true)} 
                        className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300"
                        title="Guardar Rutina"
                    >
                        <FloppyDiskIcon />
                    </button>
                </div>
            </div>
            
            {/* Days Selector */}
            <div className="mb-4 bg-surface p-3 rounded-xl border border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Días Activos</p>
                <div className="flex justify-between">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <button
                            key={d}
                            onClick={() => toggleDay(d)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                allowedDays.includes(d) 
                                ? 'bg-primary text-bkg scale-110 shadow-lg' 
                                : 'bg-gray-800 text-gray-500'
                            }`}
                        >
                            {dayLabels[d]}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 pb-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Mis Innegociables</p>
                {commitments.map((c, i) => (
                    <div key={i} className="flex gap-2 items-center bg-surface p-3 rounded-xl border border-gray-700">
                        <div className="flex-grow space-y-2">
                            <input 
                                type="text" 
                                placeholder="Ej: Leer 10 páginas" 
                                value={c.title}
                                onChange={(e) => updateField(i, 'title', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-600 focus:border-primary outline-none py-1 text-sm"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Hora (Opcional):</span>
                                <input 
                                    type="time" 
                                    value={c.time}
                                    onChange={(e) => updateField(i, 'time', e.target.value)}
                                    className="bg-gray-800 rounded px-2 py-1 text-xs text-white outline-none"
                                />
                            </div>
                        </div>
                        {commitments.length > 1 && (
                            <button onClick={() => removeField(i)} className="text-red-500 p-2"><TrashIcon /></button>
                        )}
                    </div>
                ))}
                <button onClick={addField} className="w-full py-3 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2">
                    <PlusIcon /> Añadir otro compromiso
                </button>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button onClick={onCancel} className="flex-1 py-3 text-gray-400 font-bold">Cancelar</button>
                <button onClick={onStart} className="flex-1 bg-primary text-bkg font-bold rounded-xl shadow-lg">Firmar Contrato</button>
            </div>

            {/* Save Routine Modal */}
            {showSaveModal && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface rounded-2xl p-6 w-full border border-gray-700">
                        <h3 className="text-lg font-bold mb-3">Guardar Rutina</h3>
                        <input 
                            type="text" 
                            placeholder="Nombre de la rutina (Ej: Mañanera)"
                            value={routineName}
                            onChange={e => setRoutineName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-gray-400 font-bold">Cancelar</button>
                            <button onClick={handleSave} disabled={!routineName.trim()} className="px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

