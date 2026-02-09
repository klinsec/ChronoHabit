
import React, { useState, useRef, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { CheckCircleIcon, PlusIcon, TrashIcon, RoutineIcon, HistoryIcon, FloppyDiskIcon, FolderIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon } from '../Icons';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '../../types';

const RoutinesView: React.FC = () => {
  const { contract, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, pastContracts, saveRoutine, savedRoutines, deleteRoutine } = useTimeTracker();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  // Setup State
  const [newCommitments, setNewCommitments] = useState<Omit<Commitment, 'id' | 'status'>[]>([
      { title: '', time: '' }
  ]);
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const handleStartSetup = (duration: number) => {
      setSelectedDuration(duration);
      // Reset commitments if starting fresh, or keep if we are chaining (handled below)
      if (!contract) {
          setNewCommitments([{ title: '', time: '' }]);
          setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      }
      setIsSetupOpen(true);
  };

  const handleNextContract = () => {
      // Prepare for next contract
      if (contract) {
          // Carry over existing commitments
          const existing = contract.commitments.map(c => ({ title: c.title, time: c.time || '' }));
          setNewCommitments(existing);
          setAllowedDays(contract.allowedDays || [0, 1, 2, 3, 4, 5, 6]);
          
          // Calculate next logical duration based on 1 -> 3 -> 7 -> 10 logic
          let nextDuration = contract.currentPhase;
          if (contract.currentPhase === 1) nextDuration = 3;
          else if (contract.currentPhase === 3) nextDuration = 7;
          else if (contract.currentPhase === 7) nextDuration = 10;
          else if (contract.currentPhase === 10) nextDuration = 14;
          else nextDuration = contract.currentPhase + 7; // Fallback: add a week
          
          setSelectedDuration(nextDuration);
          setIsSetupOpen(true);
      }
  };

  const handleReuseFromHistory = (item: ContractHistoryItem) => {
      const reconstructed = item.commitmentsSnapshot.map(title => ({ title, time: '' }));
      setNewCommitments(reconstructed);
      setSelectedDuration(item.phaseDuration);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]); // Default to all days if reusing from old history without allowedDays
      setShowHistory(false);
      setIsSetupOpen(true);
  };

  const handleLoadTemplate = (routine: SavedRoutine) => {
      setNewCommitments(routine.commitments);
      if (routine.allowedDays) setAllowedDays(routine.allowedDays);
      setShowLoadModal(false);
      setIsSetupOpen(true);
  };

  return (
      <div className="relative h-full flex flex-col">
           {/* Top Actions */}
           <div className="absolute top-0 right-0 z-10 flex gap-1">
                {/* Save Button: Only when contract is active */}
                {contract && !isSetupOpen && (
                    <button 
                        onClick={() => setShowSaveModal(true)}
                        className="p-2 text-gray-600 hover:text-white transition-colors"
                        title="Guardar como Plantilla"
                    >
                        <FloppyDiskIcon />
                    </button>
                )}
                
                {/* Load & History Buttons: Only when NO contract is active */}
                {!contract && !isSetupOpen && (
                    <>
                        <button 
                            onClick={() => setShowLoadModal(true)} 
                            className="p-2 text-gray-600 hover:text-white transition-colors"
                            title="Mis Plantillas"
                        >
                            <FolderIcon />
                        </button>
                        <button 
                            onClick={() => setShowHistory(true)}
                            className="p-2 text-gray-600 hover:text-white transition-colors"
                            title="Historial de Contratos"
                        >
                            <HistoryIcon />
                        </button>
                    </>
                )}
            </div>

          {isSetupOpen ? (
              <ContractSetup 
                  commitments={newCommitments} 
                  setCommitments={setNewCommitments} 
                  duration={selectedDuration}
                  setDuration={setSelectedDuration}
                  allowedDays={allowedDays}
                  setAllowedDays={setAllowedDays}
                  onCancel={() => setIsSetupOpen(false)}
                  onStart={() => {
                      startContract(newCommitments.filter(c => c.title.trim() !== ''), selectedDuration, allowedDays);
                      setIsSetupOpen(false);
                  }}
                  onSaveRoutine={saveRoutine}
                  savedRoutines={savedRoutines}
                  onDeleteRoutine={deleteRoutine}
              />
          ) : !contract ? (
              <Onboarding onStart={handleStartSetup} />
          ) : (
              <ActiveContractView 
                  contract={contract} 
                  onStatusChange={setCommitmentStatus}
                  onNext={handleNextContract}
                  onReset={resetContract}
                  onComplete={completeContract}
              />
          )}

          {showHistory && (
              <HistoryModal 
                pastContracts={pastContracts} 
                onClose={() => setShowHistory(false)} 
                onReuse={handleReuseFromHistory}
                onSaveTemplate={(title, commitments) => {
                    saveRoutine(title, commitments);
                    setShowHistory(false);
                }}
              />
          )}

          {showLoadModal && (
              <LoadRoutineModal 
                  savedRoutines={savedRoutines}
                  onClose={() => setShowLoadModal(false)}
                  onLoad={handleLoadTemplate}
                  onDelete={deleteRoutine}
              />
          )}

          {showSaveModal && contract && (
              <SaveRoutineModal 
                onClose={() => setShowSaveModal(false)}
                onSave={(name) => {
                    const cleanCommitments = contract.commitments.map(c => ({ title: c.title, time: c.time }));
                    saveRoutine(name, cleanCommitments, contract.allowedDays);
                    setShowSaveModal(false);
                }}
              />
          )}
      </div>
  );
};

// --- Sub Components ---

const SwipeableCommitment: React.FC<{
    commitment: Commitment;
    onChangeStatus: (id: string, status: CommitmentStatus) => void;
}> = ({ commitment, onChangeStatus }) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);
    const minSwipeDistance = 75;

    const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart !== null) {
            const diff = e.targetTouches[0].clientX - touchStart;
            // Limit direction based on current status? No, free flow
            setTranslateX(diff);
        }
    }

    const onTouchEnd = () => {
        if (!touchStart) return;
        
        // Right Swipe (->) : Fail (if not already failed)
        if (translateX > minSwipeDistance) {
            if (commitment.status !== 'failed') onChangeStatus(commitment.id, 'failed');
        } 
        // Left Swipe (<-) : Reset to Pending (if failed or completed)
        else if (translateX < -minSwipeDistance) {
             onChangeStatus(commitment.id, 'pending');
        }

        setTranslateX(0);
        setTouchStart(null);
    }

    const handleClick = () => {
        // Toggle Completed/Pending on click
        if (commitment.status === 'completed') onChangeStatus(commitment.id, 'pending');
        else onChangeStatus(commitment.id, 'completed');
    }

    let bgClass = 'bg-surface border-gray-700 hover:border-gray-500';
    let textClass = 'text-white';
    let icon = null;

    if (commitment.status === 'completed') {
        bgClass = 'bg-green-900/20 border-green-900/50';
        textClass = 'text-green-400 line-through';
        icon = <div className="text-green-500"><CheckCircleIcon /></div>;
    } else if (commitment.status === 'failed') {
        bgClass = 'bg-red-900/20 border-red-900/50 opacity-70';
        textClass = 'text-red-400';
        icon = <div className="text-red-500"><XMarkIcon /></div>;
    } else {
        // Pending
        icon = <div className="w-6 h-6 rounded-full border-2 border-gray-600"></div>;
    }

    return (
        <div className="relative overflow-hidden rounded-xl select-none">
            {/* Background Actions */}
            <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-gray-900 border border-gray-800">
                <div className={`font-bold text-red-500 flex items-center transition-opacity duration-200 ${translateX > 30 ? 'opacity-100' : 'opacity-0'}`}>
                    <XMarkIcon /> <span className="text-xs ml-1 font-bold">FALLADO</span>
                </div>
                <div className={`font-bold text-gray-400 flex items-center transition-opacity duration-200 ${translateX < -30 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-xs mr-1 font-bold">RESETEAR</span> <ArrowUpIcon />
                </div>
            </div>

            <div 
                className={`relative w-full text-left p-4 rounded-xl border transition-transform duration-200 flex items-center justify-between group ${bgClass}`}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={handleClick}
            >
                <div>
                    <p className={`font-bold ${textClass}`}>{commitment.title}</p>
                    {commitment.time && <p className="text-xs text-gray-500 mt-1">⏰ {commitment.time}</p>}
                </div>
                <div className="flex-shrink-0 ml-2">
                    {icon}
                </div>
            </div>
        </div>
    );
};

const LoadRoutineModal: React.FC<{ 
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

const SaveRoutineModal: React.FC<{ onClose: () => void, onSave: (name: string) => void }> = ({ onClose, onSave }) => {
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

const HistoryModal: React.FC<{ 
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
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                                item.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                            }`}>
                                                {item.status === 'completed' ? 'Completado' : 'Fallido'}
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

const Onboarding: React.FC<{ onStart: (duration: number) => void }> = ({ onStart }) => {
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

const ContractSetup: React.FC<{
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
                // Prevent removing all days
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

const ActiveContractView: React.FC<{
    contract: any;
    onStatusChange: (id: string, status: CommitmentStatus) => void;
    onNext: () => void;
    onReset: () => void;
    onComplete: () => void;
}> = ({ contract, onStatusChange, onNext, onReset, onComplete }) => {
    
    // Day 0 Handling (Waiting for tomorrow)
    if (contract.dayInPhase === 0) {
        return (
            <div className="flex flex-col h-full mt-8 items-center justify-center text-center p-6 space-y-6">
                <div className="bg-gray-800 p-6 rounded-full border border-green-500/30 shadow-lg shadow-green-900/20">
                    <span className="text-4xl">✨</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Rutina Completada!</h2>
                    <p className="text-gray-400">
                        Has terminado tus innegociables de hoy. 
                        La Fase {contract.currentPhase} comenzará oficialmente mañana.
                    </p>
                </div>
                <div className="w-full max-w-xs bg-surface p-4 rounded-xl border border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Próximo</p>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-xl text-white">Día 1 <span className="text-sm text-gray-500">/ {contract.currentPhase}</span></span>
                        <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">MAÑANA</span>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        if(confirm("¿Cancelar la espera y empezar ya? Esto contará como Día 1 HOY.")) {
                            // Manual override logic could go here, but for now we just let them reset entirely
                            onReset(); 
                        }
                    }}
                    className="text-xs text-gray-500 hover:text-white underline"
                >
                    Cancelar y reconfigurar
                </button>
            </div>
        );
    }

    const allCompleted = contract.commitments.every((c: any) => c.status === 'completed');
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;
    
    // Check if today is an allowed day
    const todayDay = new Date().getDay();
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
            <div className="flex-grow overflow-y-auto space-y-3 pb-24">
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
            <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto">
                {isPhaseDone && allCompleted ? (
                    <div className="bg-surface p-4 rounded-xl border border-green-500 shadow-2xl animate-in slide-in-from-bottom-20 fade-in duration-700 space-y-3">
                        <p className="text-center font-bold text-green-400">¡Contrato Completado!</p>
                        <button onClick={onNext} className="w-full bg-green-500 text-black font-bold py-3 rounded-lg shadow-lg">
                            Siguiente Contrato (Refinar)
                        </button>
                        <button onClick={onComplete} className="w-full bg-gray-700 text-white font-bold py-2 rounded-lg text-sm">
                            Finalizar y Volver al Menú
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <button 
                            onClick={() => {
                                if (confirm("¿Seguro que quieres romper el contrato? Volverás al inicio.")) {
                                    onReset();
                                }
                            }}
                            className="text-xs text-red-900 hover:text-red-500 font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-red-900/30"
                        >
                            Romper Contrato (Reiniciar)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutinesView;
