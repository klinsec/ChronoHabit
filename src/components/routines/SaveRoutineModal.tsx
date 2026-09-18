import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const SaveRoutineModal: React.FC<{ onClose: () => void, onSave: (name: string) => void }> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl p-6 w-full border border-gray-700">
                <h3 className="text-lg font-bold mb-3">Guardar Rutina Actual</h3>
                <input 
                    type="text" 
                    placeholder="Nombre de la rutina (Ej: Entrenamiento)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4"
                    autoFocus
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 font-bold">Cancelar</button>
                    <button onClick={() => { if(name.trim()) onSave(name); }} disabled={!name.trim()} className="px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50">Guardar</button>
                </div>
            </div>
        </div>
    );
};

