import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const HistoryModal: React.FC<{ 
    pastContracts: ContractHistoryItem[], 
    onClose: () => void, 
    onReuse: (item: ContractHistoryItem) => void,
    onSaveTemplate: (title: string, commitments: any[]) => void
}> = ({ pastContracts, onClose, onReuse, onSaveTemplate }) => {
    
    const [savingItem, setSavingItem] = useState<ContractHistoryItem | null>(null);
    const [templateName, setTemplateName] = useState('');

    const handleSaveSubmit = () => {
        if (savingItem && templateName.trim()) {
            const reconstructed = savingItem.commitmentsSnapshot.map(title => ({ title, time: '' }));
            onSaveTemplate(templateName, reconstructed);
            setSavingItem(null);
            setTemplateName('');
        }
    };

    const getStatusBadge = (status: 'completed' | 'failed' | 'finished') => {
        switch(status) {
            case 'completed': return 'bg-green-900/30 text-green-400';
            case 'finished': return 'bg-yellow-900/30 text-yellow-400';
            case 'failed': return 'bg-red-900/30 text-red-400';
            default: return 'bg-gray-700 text-gray-400';
        }
    }

    const getStatusText = (status: 'completed' | 'failed' | 'finished') => {
        switch(status) {
            case 'completed': return 'Completado';
            case 'finished': return 'Finalizado';
            case 'failed': return 'Fallido';
            default: return status;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {savingItem ? (
                 <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl">
                    <h3 className="text-lg font-bold mb-3">Guardar Historial como Plantilla</h3>
                    <input 
                        type="text" 
                        placeholder="Nombre de la plantilla"
                        value={templateName}
                        onChange={e => setTemplateName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setSavingItem(null)} className="px-4 py-2 text-gray-400 font-bold">Cancelar</button>
                        <button onClick={handleSaveSubmit} disabled={!templateName.trim()} className="px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50">Guardar</button>
                    </div>
                </div>
            ) : (
                <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl max-h-[80vh] flex flex-col">
                    <h2 className="text-xl font-bold mb-4 text-on-surface border-b border-gray-700 pb-2">Historial Reciente</h2>
                    <div className="flex-grow overflow-y-auto space-y-3">
                        {pastContracts.length === 0 ? (
                            <p className="text-gray-500 text-center py-4 text-sm">No hay contratos archivados aún.</p>
                        ) : (
                            pastContracts.map((item) => (
                                <div key={item.id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-white">{item.phaseDuration} Días</span>
                                                <span className="text-[10px] text-gray-500">
                                                    {new Date(item.endDate).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}
                                                </span>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${getStatusBadge(item.status)}`}>
                                                {getStatusText(item.status)}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 text-right">
                                            {item.commitmentsSnapshot.length} Compromisos
                                        </p>
                                    </div>
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700/50">
                                        <button onClick={() => onReuse(item)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs font-bold">
                                            Reusar
                                        </button>
                                        <button onClick={() => setSavingItem(item)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs font-bold">
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white text-sm">
                        Cerrar
                    </button>
                </div>
            )}
        </div>
    );
}

