
import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { ContractIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '../Icons';
import { Commitment, ContractPhase } from '../../types';

const DisciplineView: React.FC = () => {
  const { contract, startContract, toggleCommitment, advancePhase, resetContract } = useTimeTracker();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  
  // Setup State
  const [newCommitments, setNewCommitments] = useState<Omit<Commitment, 'id' | 'completedToday'>[]>([
      { title: '', time: '' }
  ]);

  if (!contract) {
      if (isSetupOpen) {
          return (
              <ContractSetup 
                  commitments={newCommitments} 
                  setCommitments={setNewCommitments} 
                  onCancel={() => setIsSetupOpen(false)}
                  onStart={() => {
                      startContract(newCommitments.filter(c => c.title.trim() !== ''));
                      setIsSetupOpen(false);
                  }}
              />
          );
      }
      return <Onboarding onStart={() => setIsSetupOpen(true)} />;
  }

  return (
      <ActiveContractView 
          contract={contract} 
          onToggle={toggleCommitment}
          onAdvance={advancePhase}
          onReset={resetContract}
      />
  );
};

// --- Sub Components ---

const Onboarding: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="flex flex-col h-full items-center justify-center p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="p-4 bg-primary/10 rounded-full text-primary">
            <div className="transform scale-150"><ContractIcon /></div>
        </div>
        <h2 className="text-2xl font-bold text-white">Método 1 + 3 + 7 + 10</h2>
        <p className="text-gray-400 text-sm">
            Entrena tu disciplina personal mediante contratos progresivos. 
            No busques resultados inmediatos, busca no fallar a tu palabra.
        </p>
        <div className="grid grid-cols-4 gap-2 w-full max-w-xs mt-4">
            {[1, 3, 7, 10].map(d => (
                <div key={d} className="bg-gray-800 rounded-lg p-2 flex flex-col items-center">
                    <span className="text-lg font-bold text-white">{d}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Días</span>
                </div>
            ))}
        </div>
        <button 
            onClick={onStart}
            className="w-full max-w-xs bg-primary hover:bg-purple-500 text-bkg font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
        >
            Firmar Primer Contrato
        </button>
    </div>
);

const ContractSetup: React.FC<{
    commitments: Omit<Commitment, 'id' | 'completedToday'>[];
    setCommitments: React.Dispatch<React.SetStateAction<Omit<Commitment, 'id' | 'completedToday'>[]>>;
    onCancel: () => void;
    onStart: () => void;
}> = ({ commitments, setCommitments, onCancel, onStart }) => {
    
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
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Define tus Innegociables</h2>
                <p className="text-xs text-gray-400">¿A qué te comprometes durante las próximas 24 horas?</p>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 pb-4">
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
                <button onClick={onStart} className="flex-1 bg-primary text-bkg font-bold rounded-xl shadow-lg">Firmar</button>
            </div>
        </div>
    );
};

const ActiveContractView: React.FC<{
    contract: any;
    onToggle: (id: string) => void;
    onAdvance: () => void;
    onReset: () => void;
}> = ({ contract, onToggle, onAdvance, onReset }) => {
    
    const allCompleted = contract.commitments.every((c: any) => c.completedToday);
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;

    return (
        <div className="flex flex-col h-full relative">
            {/* Header / Progress */}
            <div className="bg-surface p-4 rounded-2xl mb-6 shadow-lg border border-gray-800">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest">Fase Actual</p>
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
            <div className="flex-grow overflow-y-auto space-y-3 pb-20">
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
                    <div className="bg-surface p-4 rounded-xl border border-green-500 shadow-2xl animate-bounce">
                        <p className="text-center font-bold text-green-400 mb-2">¡Fase {contract.currentPhase} Completada!</p>
                        {contract.currentPhase === 10 ? (
                            <button onClick={onReset} className="w-full bg-green-500 text-black font-bold py-3 rounded-lg">
                                ¡Disciplina Maestra Conseguida! (Reiniciar)
                            </button>
                        ) : (
                            <button onClick={onAdvance} className="w-full bg-green-500 text-black font-bold py-3 rounded-lg">
                                Firmar por {contract.currentPhase === 1 ? 3 : contract.currentPhase === 3 ? 7 : 10} Días
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <button 
                            onClick={() => {
                                if (confirm("¿Seguro que quieres romper el contrato? Volverás al inicio.")) {
                                    onReset();
                                }
                            }}
                            className="text-xs text-red-900 hover:text-red-500 font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm"
                        >
                            Romper Contrato (Reiniciar)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DisciplineView;
