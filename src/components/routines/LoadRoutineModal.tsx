import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const LoadRoutineModal: React.FC<{ 
    savedRoutines: SavedRoutine[], 
    onClose: () => void, 
    onLoad: (r: SavedRoutine) => void,
    onDelete: (id: string) => void
}> = ({ savedRoutines, onClose, onLoad, onDelete }) => {
    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl p-4 w-full h-3/4 border border-gray-700 flex flex-col max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <h3 className="text-lg font-bold text-white">Mis Plantillas</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2">
                    {savedRoutines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                            <FolderIcon />
                            <p className="text-sm">No tienes rutinas guardadas.</p>
                        </div>
                    ) : (
                        savedRoutines.map(r => (
                            <div key={r.id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700 group hover:border-gray-500 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-white text-lg">{r.title}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar plantilla?")) onDelete(r.id); }} 
                                        className="text-gray-500 hover:text-red-400 p-1"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">{r.commitments.length} compromisos</p>
                                <button 
                                    onClick={() => onLoad(r)} 
                                    className="w-full bg-gray-700 hover:bg-primary hover:text-bkg text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Cargar Rutina
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

