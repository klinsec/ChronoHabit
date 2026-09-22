import React, { useState, useEffect } from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { PlusIcon, HistoryIcon, FloppyDiskIcon, FolderIcon } from '@/components/Icons';
import { Commitment, ContractHistoryItem, SavedRoutine } from '@/types';
import { LoadRoutineModal } from '@/components/routines/LoadRoutineModal';
import { SaveRoutineModal } from '@/components/routines/SaveRoutineModal';
import { HistoryModal } from '@/components/routines/HistoryModal';
import { Onboarding } from '@/components/routines/Onboarding';
import { ContractSetup } from '@/components/routines/ContractSetup';
import { ActiveContractView } from '@/components/routines/ActiveContractView';
import { MorningMomentumModule, ShutdownModule, LibraryModal } from '@/components/routines/RoutineModules';
import { motion, AnimatePresence } from 'framer-motion';

const RoutinesView: React.FC = () => {
  const { contract, startContract, setCommitmentStatus, resetContract, completeContract, completeDay, pastContracts, saveRoutine, savedRoutines, deleteRoutine, getNow } = useTimeTracker();
  
  // Prototype State for active modules
  const [activeModules, setActiveModules] = useState<string[]>(() => {
      const saved = localStorage.getItem('activeRoutineModules');
      return saved ? JSON.parse(saved) : ['contract'];
  });

  useEffect(() => {
      localStorage.setItem('activeRoutineModules', JSON.stringify(activeModules));
  }, [activeModules]);

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [morningFinished, setMorningFinished] = useState(false);
  
  // Setup State
  const [newCommitments, setNewCommitments] = useState<Omit<Commitment, 'id' | 'status'>[]>([
      { title: '', time: '' }
  ]);
  const [allowedDays, setAllowedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const handleStartSetup = (duration: number) => {
      setSelectedDuration(duration);
      if (!contract) {
          setNewCommitments([{ title: '', time: '' }]);
          setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      }
      setIsSetupOpen(true);
  };

  const handleNextContract = () => {
      if (contract) {
          const existing = contract.commitments.map(c => ({ title: c.title, time: c.time || '' }));
          const currentAllowedDays = contract.allowedDays || [0, 1, 2, 3, 4, 5, 6];
          const currentPhase = contract.currentPhase;

          completeContract();
          
          setNewCommitments(existing);
          setAllowedDays(currentAllowedDays);
          
          let nextDuration = currentPhase;
          if (currentPhase === 1) nextDuration = 3;
          else if (currentPhase === 3) nextDuration = 7;
          else if (currentPhase === 7) nextDuration = 10;
          else if (currentPhase === 10) nextDuration = 14;
          else nextDuration = currentPhase + 7;
          
          setSelectedDuration(nextDuration);
          setIsSetupOpen(true);
      }
  };

  const handleReuseFromHistory = (item: ContractHistoryItem) => {
      const reconstructed = item.commitmentsSnapshot.map(title => ({ title, time: '' }));
      setNewCommitments(reconstructed);
      setSelectedDuration(item.phaseDuration);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      setShowHistory(false);
      setIsSetupOpen(true);
  };

  const handleLoadTemplate = (routine: SavedRoutine) => {
      setNewCommitments(routine.commitments);
      if (routine.allowedDays) setAllowedDays(routine.allowedDays);
      setShowLoadModal(false);
      setIsSetupOpen(true);
  };

  const removeModule = (id: string) => {
      setActiveModules(prev => prev.filter(m => m !== id));
  };

  return (
      <div className="relative h-full flex flex-col pb-20 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 bg-surface p-3 rounded-xl shadow-md sticky top-0 z-20">
              <h2 className="text-xl font-semibold text-primary">Tus Rutinas</h2>
              <div className="flex gap-2">
                  <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1 bg-primary text-bkg px-3 py-1 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                      <PlusIcon /> Añadir
                  </button>
              </div>
          </div>

          <div className="flex flex-col gap-6 px-1">
            <AnimatePresence>
                {activeModules.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-gray-500 italic">
                        No tienes rutinas activas. Abre la biblioteca para añadir una.
                    </motion.div>
                )}

                {activeModules.includes('202020') && (
                    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={morningFinished ? "order-last" : "order-first"}>
                        <MorningMomentumModule onRemove={() => removeModule('202020')} onStateChange={setMorningFinished} />
                    </motion.div>
                )}

                {activeModules.includes('contract') && (
                      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-surface border border-gray-700/50 rounded-xl p-4 shadow-lg">
                          <button onClick={() => removeModule('contract')} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 z-10 w-6 h-6 flex items-center justify-center bg-gray-800 rounded-full">X</button>
                          
                          {/* Top Actions for Contract */}
                          <div className="absolute top-2 right-10 z-10 flex gap-1">
                              {contract && !isSetupOpen && (
                                  <button onClick={() => setShowSaveModal(true)} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Guardar como Plantilla">
                                      <FloppyDiskIcon />
                                  </button>
                              )}
                              {!contract && !isSetupOpen && (
                                  <>
                                      <button onClick={() => setShowLoadModal(true)} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Mis Plantillas">
                                          <FolderIcon />
                                      </button>
                                      <button onClick={() => setShowHistory(true)} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Historial">
                                          <HistoryIcon />
                                      </button>
                                  </>
                              )}
                          </div>

                          <div className="pt-2">
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
                                      onCompleteDay={completeDay}
                                      currentDayIndex={new Date(getNow()).getDay()}
                                  />
                              )}
                          </div>
                      </motion.div>
                  )}

                  {activeModules.includes('shutdown') && (
                      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                          <ShutdownModule onRemove={() => removeModule('shutdown')} />
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

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

          {showLibrary && (
              <LibraryModal 
                  active={activeModules}
                  onAdd={(id) => { setActiveModules([...activeModules, id]); setShowLibrary(false); }}
                  onClose={() => setShowLibrary(false)}
              />
          )}
      </div>
  );
};

export default RoutinesView;
