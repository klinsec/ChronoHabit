
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { ContractIcon, CheckCircleIcon, PlusIcon, TrashIcon, RoutineIcon } from '../Icons';
import { Commitment } from '../../types';

const RoutinesView: React.FC = () => {
  const { contract, startContract, toggleCommitment, resetContract } = useTimeTracker();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  
  // Setup State
  const [newCommitments, setNewCommitments] = useState<Omit<Commitment, 'id' | 'completedToday'>[]>([
      { title: '', time: '' }
  ]);

  const handleStartSetup = (duration: number) => {
      setSelectedDuration(duration);
      // Reset commitments if starting fresh, or keep if we are chaining (handled below)
      if (!contract) {
          setNewCommitments([{ title: '', time: '' }]);
      }
      setIsSetupOpen(true);
  };

  const handleNextContract = () => {
      // Prepare for next contract
      if (contract) {
          // Carry over existing commitments
          const existing = contract.commitments.map(c => ({ title: c.title, time: c.time || '' }));
          setNewCommitments(existing);
          
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

  if (isSetupOpen) {
      return (
          <ContractSetup 
              commitments={newCommitments} 
              setCommitments={setNewCommitments} 
              duration={selectedDuration}
              setDuration={setSelectedDuration}
              onCancel={() => setIsSetupOpen(false)}
              onStart={() => {
                  startContract(newCommitments.filter(c => c.title.trim() !== ''), selectedDuration);
                  setIsSetupOpen(false);
              }}
          />
      );
  }

  if (!contract) {
      return <Onboarding onStart={handleStartSetup} />;
  }

  return (
      <ActiveContractView 
          contract={contract} 
          onToggle={toggleCommitment}
          onNext={handleNextContract}
          onReset={resetContract}
      />
  );
};

// --- Sub Components ---

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
    commitments: Omit<Commitment, 'id' | 'completedToday'>[];
    setCommitments: React.Dispatch<React.SetStateAction<Omit<Commitment, 'id' | 'completedToday'>[]>>;
    duration: number;
    setDuration: (d: number) => void;
    onCancel: () => void;
    onStart: () => void;
}> = ({ commitments, setCommitments, duration, setDuration, onCancel, onStart }) => {
    
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

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
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
        </div>
    );
};

const ActiveContractView: React.FC<{
    contract: any;
    onToggle: (id: string) => void;
    onNext: () => void;
    onReset: () => void;
}> = ({ contract, onToggle, onNext, onReset }) => {
    
    const allCompleted = contract.commitments.every((c: any) => c.completedToday);
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;

    return (
        <div className="flex flex-col h-full relative">
            {/* Header / Progress */}
            <div className="bg-surface p-4 rounded-2xl mb-6 shadow-lg border border-gray-800">
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
                    <button 
                        key={c.id} 
                        onClick={() => onToggle(c.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                            c.completedToday 
                            ? 'bg-green-900/20 border-green-900/50' 
                            : 'bg-surface border-gray-700 hover:border-gray-500'
                        }`}
                    >
                        <div>
                            <p className={`font-bold ${c.completedToday ? 'text-green-400 line-through' : 'text-white'}`}>{c.title}</p>
                            {c.time && <p className="text-xs text-gray-500 mt-1">⏰ {c.time}</p>}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            c.completedToday ? 'border-green-500 bg-green-500 text-black' : 'border-gray-600 group-hover:border-primary'
                        }`}>
                            {c.completedToday && <CheckCircleIcon />}
                        </div>
                    </button>
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
                        <button onClick={onReset} className="w-full bg-gray-700 text-white font-bold py-2 rounded-lg text-sm">
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
