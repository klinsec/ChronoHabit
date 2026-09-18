
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { CheckCircleIcon, PlusIcon, TrashIcon, RoutineIcon, HistoryIcon, FloppyDiskIcon, FolderIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/Icons';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { SwipeableCommitment } from '@/components/routines/SwipeableCommitment';
import { LoadRoutineModal } from '@/components/routines/LoadRoutineModal';
import { SaveRoutineModal } from '@/components/routines/SaveRoutineModal';
import { HistoryModal } from '@/components/routines/HistoryModal';
import { Onboarding } from '@/components/routines/Onboarding';
import { ContractSetup } from '@/components/routines/ContractSetup';
import { ActiveContractView } from '@/components/routines/ActiveContractView';

const RoutinesView: React.FC = () => {
  const { contract, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, completeDay, pastContracts, saveRoutine, savedRoutines, deleteRoutine, getNow } = useTimeTracker();
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
      if (!contract) {
          setNewCommitments([{ title: '', time: '' }]);
          setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      }
      setIsSetupOpen(true);
  };

  const handleNextContract = () => {
      if (contract) {
          // Capture current data before archiving
          const existing = contract.commitments.map(c => ({ title: c.title, time: c.time || '' }));
          const currentAllowedDays = contract.allowedDays || [0, 1, 2, 3, 4, 5, 6];
          const currentPhase = contract.currentPhase;

          // Archive the current contract (saves points and streak)
          // This is what "Finalizar" does, and the user wants "Refinar" to do the same before starting the next phase
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

  return (
      <div className="relative h-full flex flex-col">
           {/* Top Actions */}
           <div className="absolute top-0 right-0 z-10 flex gap-1">
                {contract && !isSetupOpen && (
                    <button 
                        onClick={() => setShowSaveModal(true)}
                        className="p-2 text-gray-600 hover:text-white transition-colors"
                        title="Guardar como Plantilla"
                    >
                        <FloppyDiskIcon />
                    </button>
                )}
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
                  onCompleteDay={completeDay}
                  currentDayIndex={new Date(getNow()).getDay()}
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



export default RoutinesView;
