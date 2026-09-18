import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const Onboarding: React.FC<{ onStart: (duration: number) => void }> = ({ onStart }) => {
    const [customDays, setCustomDays] = useState('');

    return (
        <div className="flex flex-col h-full items-center justify-center p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
                <div className="transform scale-150"><RoutineIcon /></div>
            </div>
            <h2 className="text-2xl font-bold text-white">Método 1 + 3 + 7 + 10</h2>
            <p className="text-gray-400 text-sm">
                Selecciona la duración de tu próximo contrato de disciplina.
            </p>
            <div className="grid grid-cols-4 gap-2 w-full max-w-xs mt-4">
                {[1, 3, 7, 10].map(d => (
                    <button 
                        key={d} 
                        onClick={() => onStart(d)}
                        className="bg-gray-800 hover:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors"
                    >
                        <span className="text-lg font-bold text-white">{d}</span>
                        <span className="text-[10px] text-gray-500 uppercase">Días</span>
                    </button>
                ))}
            </div>
            
            <div className="flex items-center space-x-2 w-full max-w-xs bg-gray-800 rounded-lg p-2">
                <span className="text-xs text-gray-400 pl-2">Otro:</span>
                <input 
                    type="number" 
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="#"
                    className="bg-transparent w-full text-white outline-none font-bold"
                />
                <button 
                    onClick={() => {
                        const d = parseInt(customDays);
                        if (d > 0) onStart(d);
                    }}
                    disabled={!customDays}
                    className="text-xs bg-primary text-bkg font-bold px-3 py-1 rounded disabled:opacity-50"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

