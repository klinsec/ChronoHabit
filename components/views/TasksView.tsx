
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { Subtask, SubtaskStatus } from '../../types';
import SubtaskModal from '../modals/SubtaskModal';
import SettingsModal from '../modals/SettingsModal';
import { EditIcon, TrashIcon, PlusIcon, EyeIcon, EyeOffIcon, CogIcon, ArrowUpIcon, ArrowDownIcon, ArchiveIcon } from '../Icons';

const TasksView: React.FC = () => {
  const { tasks, subtasks, deleteSubtask, moveSubtaskStatus, getTaskById, lastAddedSubtaskId } = useTimeTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Deep Link Handling (Manual Add only, removed AI)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manualAdd = params.get('add');

    if (manualAdd === 'task') {
        const title = params.get('title') || '';
        const desc = params.get('desc') || '';
        const timer = setTimeout(() => {
            setEditingSubtask({
                id: '',
                title: title,
                description: desc,
                taskId: tasks.length > 0 ? tasks[0].id : '',
                status: 'idea',
                completed: false,
                createdAt: Date.now()
            });
            setIsModalOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [tasks]);

  // Overflow State
  const [overflowState, setOverflowState] = useState<{ isOpen: boolean; incomingTask: Subtask | null; targetSection: 'today' | 'pending' | null }>({
      isOpen: false,
      incomingTask: null,
      targetSection: null
  });

  // Group subtasks by status
  const todayTasks = useMemo(() => subtasks.filter(s => s.status === 'today').sort((a,b) => a.createdAt - b.createdAt), [subtasks]);
  const pendingTasks = useMemo(() => subtasks.filter(s => s.status === 'pending').sort((a,b) => a.createdAt - b.createdAt), [subtasks]);
  const ideaTasks = useMemo(() => subtasks.filter(s => s.status === 'idea').sort((a,b) => a.createdAt - b.createdAt), [subtasks]);
  const logTasks = useMemo(() => subtasks.filter(s => s.status === 'log').sort((a,b) => b.createdAt - a.createdAt), [subtasks]);

  const activeTodayCount = todayTasks.filter(s => !s.completed).length;

  // Watch for new tasks to highlight
  useEffect(() => {
    if (lastAddedSubtaskId) {
        const newTask = subtasks.find(s => s.id === lastAddedSubtaskId);
        if (newTask) {
            if (newTask.status === 'idea' && !showIdeas) {
                setShowIdeas(true);
            }
            setHighlightedTaskId(lastAddedSubtaskId);
            const timer = setTimeout(() => setHighlightedTaskId(null), 2000);
            return () => clearTimeout(timer);
        }
    }
  }, [lastAddedSubtaskId, subtasks]);

  const handleEdit = (subtask: Subtask) => {
    setEditingSubtask(subtask);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSubtask(null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubtask(null);
  };

  const handleCloseOverflow = () => {
      setOverflowState({ isOpen: false, incomingTask: null, targetSection: null });
  };
  
  const checkLimitAndMove = (subtask: Subtask, targetStatus: SubtaskStatus) => {
      if (targetStatus === 'today') {
          if (activeTodayCount >= 5) {
              setOverflowState({ isOpen: true, incomingTask: subtask, targetSection: 'today' });
              return;
          }
      } else if (targetStatus === 'pending') {
          if (pendingTasks.length >= 7) {
              setOverflowState({ isOpen: true, incomingTask: subtask, targetSection: 'pending' });
              return;
          }
      }
      moveSubtaskStatus(subtask.id, targetStatus);
  };
  
  const handleOverflowResolution = (evictedTask: Subtask, newStatusForEvicted: SubtaskStatus) => {
      moveSubtaskStatus(evictedTask.id, newStatusForEvicted);
      if (overflowState.incomingTask && overflowState.targetSection) {
          moveSubtaskStatus(overflowState.incomingTask.id, overflowState.targetSection);
      }
      handleCloseOverflow();
  };

  const moveToToday = (subtask: Subtask) => checkLimitAndMove(subtask, 'today');
  const moveToPending = (subtask: Subtask) => checkLimitAndMove(subtask, 'pending');
  const moveToIdeas = (subtask: Subtask) => moveSubtaskStatus(subtask.id, 'idea');

  return (
    <div className="relative h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 bg-surface p-3 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold text-primary">Modo Diario</h2>
        <div className="flex items-center space-x-2">
            <button
                onClick={() => setShowLog(!showLog)}
                className={`p-2 rounded-full transition-colors ${showLog ? 'text-secondary bg-secondary/10' : 'text-gray-400 hover:text-white'}`}
                title={showLog ? "Ocultar completados" : "Ver completados"}
            >
                <ArchiveIcon />
            </button>
            <button 
                onClick={() => setShowIdeas(!showIdeas)} 
                className={`p-2 rounded-full transition-colors ${showIdeas ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-white'}`}
                title={showIdeas ? "Ocultar ideas" : "Ver ideas"}
            >
                {showIdeas ? <EyeIcon /> : <EyeOffIcon />}
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                title="Configuración"
            >
                <CogIcon />
            </button>
            <button 
                onClick={handleAdd}
                className="p-2 rounded-full bg-primary text-bkg hover:bg-purple-500 transition-colors shadow-lg"
                title="Añadir nueva idea"
            >
                <PlusIcon />
            </button>
        </div>
      </div>

      <div className="space-y-6 pb-24 overflow-y-auto flex-grow px-1">
        {/* Today Section */}
        <div className="bg-surface/50 rounded-xl p-4 border border-primary/20">
            <h3 className="text-lg font-bold mb-3 flex justify-between items-center">
                <span>Hoy</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${activeTodayCount >= 5 ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'}`}>
                    {activeTodayCount}/5
                </span>
            </h3>
            {todayTasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-2">No hay tareas para hoy.</p>
            ) : (
                <div className="space-y-2">
                    {todayTasks.map(subtask => (
                        <SubtaskItem 
                            key={subtask.id} 
                            subtask={subtask} 
                            onEdit={handleEdit} 
                            getTaskById={getTaskById}
                            isHighlighted={highlightedTaskId === subtask.id}
                            onSwipeRight={() => moveToPending(subtask)}
                            rightActionLabel="Pendientes"
                            rightActionColor="text-yellow-500"
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Pending Section */}
        <div className="bg-surface/30 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-3 flex justify-between items-center text-gray-300">
                <span>Pendientes</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${pendingTasks.length >= 7 ? 'bg-red-900 text-red-200' : 'bg-gray-700 text-gray-300'}`}>
                    {pendingTasks.length}/7
                </span>
            </h3>
            {pendingTasks.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center py-2">No hay tareas pendientes.</p>
            ) : (
                <div className="space-y-2">
                    {pendingTasks.map(subtask => (
                        <SubtaskItem 
                            key={subtask.id} 
                            subtask={subtask} 
                            onEdit={handleEdit} 
                            getTaskById={getTaskById}
                            isHighlighted={highlightedTaskId === subtask.id}
                            onSwipeLeft={() => moveToToday(subtask)}
                            leftActionLabel="Hoy"
                            leftActionColor="text-green-500"
                            onSwipeRight={() => moveToIdeas(subtask)}
                            rightActionLabel="Ideas"
                            rightActionColor="text-blue-500"
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Ideas Section */}
        {showIdeas && (
            <div className="bg-gray-800/20 rounded-xl p-4 border-t-2 border-gray-700 border-dashed transition-all duration-300">
                <h3 className="text-lg font-bold mb-3 text-gray-400">Ideas de Tareas</h3>
                {ideaTasks.length === 0 ? (
                    <p className="text-gray-500 text-sm italic text-center py-2">Tu lista de ideas está vacía.</p>
                ) : (
                    <div className="space-y-2">
                        {ideaTasks.map(subtask => (
                            <SubtaskItem 
                                key={subtask.id} 
                                subtask={subtask} 
                                onEdit={handleEdit} 
                                getTaskById={getTaskById}
                                isHighlighted={highlightedTaskId === subtask.id}
                                onSwipeLeft={() => moveToPending(subtask)}
                                leftActionLabel="Pendientes"
                                leftActionColor="text-yellow-500"
                            />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Log Section */}
        {showLog && (
             <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 transition-all duration-300">
                <h3 className="text-lg font-bold mb-3 text-gray-500 flex items-center gap-2">
                    <ArchiveIcon /> Historial Completado
                </h3>
                {logTasks.length === 0 ? (
                    <p className="text-gray-600 text-sm italic text-center py-2">No hay tareas archivadas recientemente.</p>
                ) : (
                    <div className="space-y-2">
                        {logTasks.map(subtask => (
                             <SubtaskItem 
                                key={subtask.id} 
                                subtask={subtask} 
                                onEdit={handleEdit} 
                                getTaskById={getTaskById}
                                onSwipeLeft={() => moveToIdeas(subtask)}
                                leftActionLabel="Reusar"
                                leftActionColor="text-blue-500"
                            />
                        ))}
                    </div>
                )}
             </div>
        )}

      </div>

      {isModalOpen && <SubtaskModal subtask={editingSubtask} onClose={handleCloseModal} />}
      
      {overflowState.isOpen && overflowState.targetSection && (
          <OverflowModal 
              isOpen={overflowState.isOpen}
              onClose={handleCloseOverflow}
              targetSection={overflowState.targetSection}
              tasks={overflowState.targetSection === 'today' ? todayTasks : pendingTasks}
              getTaskById={getTaskById}
              onResolve={handleOverflowResolution}
              isTodayFull={activeTodayCount >= 5}
          />
      )}

      {isSettingsOpen && (
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

interface SubtaskItemProps {
    subtask: Subtask;
    onEdit: (subtask: Subtask) => void;
    getTaskById: (id: string) => any;
    isHighlighted?: boolean;
    onSwipeLeft?: () => void;
    leftActionLabel?: string;
    leftActionColor?: string;
    onSwipeRight?: () => void;
    rightActionLabel?: string;
    rightActionColor?: string;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ 
    subtask, onEdit, getTaskById, isHighlighted, 
    onSwipeLeft, leftActionLabel, leftActionColor,
    onSwipeRight, rightActionLabel, rightActionColor
}) => {
    const { toggleSubtaskCompletion, deleteSubtask } = useTimeTracker();
    const parentTask = getTaskById(subtask.taskId);
    
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);
    const itemRef = useRef<HTMLDivElement>(null);

    const minSwipeDistance = 75;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
        if (touchStart !== null) {
            const diff = e.targetTouches[0].clientX - touchStart;
            if (diff > 0 && !onSwipeRight) return;
            if (diff < 0 && !onSwipeLeft) return;
            setTranslateX(diff);
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            setTranslateX(0);
            return;
        }
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && onSwipeLeft) {
            onSwipeLeft();
        } else if (isRightSwipe && onSwipeRight) {
            onSwipeRight();
        }

        setTranslateX(0);
        setTouchStart(null);
        setTouchEnd(null);
    };
    
    const getDeadlineBadge = (deadline?: number) => {
        if (!deadline) return null;
        const now = new Date();
        now.setHours(0,0,0,0);
        const date = new Date(deadline);
        date.setHours(0,0,0,0);
        
        const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        let colorClass = 'bg-green-500/20 text-green-400';
        if (diffDays <= 0) colorClass = 'bg-red-500/20 text-red-400 animate-pulse font-bold';
        else if (diffDays <= 2) colorClass = 'bg-orange-500/20 text-orange-400';
        else if (diffDays <= 7) colorClass = 'bg-yellow-500/20 text-yellow-400';

        return (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${colorClass}`}>
                {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
        );
    };

    return (
        <div className="relative overflow-hidden rounded-lg">
            <div className={`absolute inset-0 flex items-center justify-between px-4 rounded-lg bg-surface border border-gray-700`}>
                 <div className={`font-bold ${rightActionColor} flex items-center`}>
                     {onSwipeRight && translateX > 30 && (
                         <>
                             <ArrowDownIcon />
                             <span className="ml-1 text-xs uppercase">{rightActionLabel}</span>
                         </>
                     )}
                 </div>
                 <div className={`font-bold ${leftActionColor} flex items-center`}>
                    {onSwipeLeft && translateX < -30 && (
                        <>
                             <span className="mr-1 text-xs uppercase">{leftActionLabel}</span>
                             <ArrowUpIcon />
                        </>
                    )}
                 </div>
            </div>

            <div 
                ref={itemRef}
                className={`relative bg-surface p-3 rounded-lg flex items-center transition-transform duration-200 border border-gray-800 hover:border-gray-600 
                    ${subtask.completed ? 'opacity-50' : ''} 
                    ${isHighlighted ? 'ring-2 ring-primary animate-pulse' : ''}`}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <input 
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => toggleSubtaskCompletion(subtask.id)}
                    className="form-checkbox h-5 w-5 text-primary bg-gray-800 border-gray-600 rounded focus:ring-primary flex-shrink-0"
                />
                
                <div className="flex-grow mx-3 min-w-0 select-none">
                    <div className="flex items-center flex-wrap gap-x-2">
                        {parentTask && <span className="text-lg flex-shrink-0" title={parentTask.name}>{parentTask.icon}</span>}
                        <p className={`font-medium text-on-surface truncate ${subtask.completed ? 'line-through text-gray-500' : ''}`}>{subtask.title}</p>
                        {getDeadlineBadge(subtask.deadline)}
                    </div>
                    {subtask.description && <p className={`text-xs text-gray-400 truncate ${subtask.completed ? 'line-through' : ''}`}>{subtask.description}</p>}
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                    <button onClick={() => onEdit(subtask)} className="text-gray-500 hover:text-secondary p-1">
                        <EditIcon />
                    </button>
                    <button onClick={() => deleteSubtask(subtask.id)} className="text-gray-500 hover:text-red-500 p-1">
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </div>
    )
}

interface OverflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetSection: 'today' | 'pending';
    tasks: Subtask[];
    getTaskById: (id: string) => any;
    onResolve: (evictedTask: Subtask, newStatus: SubtaskStatus) => void;
    isTodayFull: boolean;
}

const OverflowModal: React.FC<OverflowModalProps> = ({ isOpen, onClose, targetSection, tasks, getTaskById, onResolve, isTodayFull }) => {
    if (!isOpen) return null;
    const sortedTasks = [...tasks].sort((a,b) => a.createdAt - b.createdAt);
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-4">
             <div className="bg-surface border border-primary/30 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                 <div className="mb-4 text-center">
                    <h2 className="text-xl font-bold text-red-400 mb-1">
                        Sección {targetSection === 'today' ? 'Hoy' : 'Pendientes'} Llena
                    </h2>
                    <p className="text-sm text-gray-300">
                        {targetSection === 'today' 
                            ? 'Desliza una tarea hacia la DERECHA para moverla a Pendientes y liberar espacio.' 
                            : isTodayFull 
                                ? 'Desliza una tarea hacia la DERECHA para moverla a Ideas. (Hoy está lleno)'
                                : 'Desliza hacia izquierda (Hoy) o derecha (Ideas) para liberar espacio.'
                        }
                    </p>
                 </div>
                 
                 <div className="flex-grow overflow-y-auto space-y-3 px-1 py-2">
                     {sortedTasks.map(task => (
                        <div key={task.id} className="relative overflow-hidden rounded-lg group">
                            <div className="absolute inset-0 flex items-center justify-between px-4 bg-gray-900 rounded-lg">
                                 <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                                      {targetSection === 'today' 
                                        ? <> <ArrowDownIcon /> MOVER A PENDIENTES </>
                                        : <> <ArrowDownIcon /> MOVER A IDEAS </>}
                                 </div>
                                 <div className="flex items-center gap-1 text-xs font-bold text-green-500">
                                     {targetSection === 'pending' && !isTodayFull && (
                                         <>
                                            MOVER A HOY
                                            <ArrowUpIcon />
                                         </>
                                     )}
                                 </div>
                            </div>
                             <SwipeableModalItem 
                                task={task} 
                                parentTask={getTaskById(task.taskId)} 
                                onSwipeRight={() => onResolve(task, targetSection === 'today' ? 'pending' : 'idea')}
                                onSwipeLeft={targetSection === 'pending' && !isTodayFull 
                                    ? () => onResolve(task, 'today') 
                                    : undefined
                                }
                             />
                        </div>
                     ))}
                 </div>
                 
                 <button onClick={onClose} className="mt-4 w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-gray-300">
                     Cancelar
                 </button>
             </div>
        </div>
    )
}

const SwipeableModalItem = ({ task, parentTask, onSwipeRight, onSwipeLeft }: { task: Subtask, parentTask: any, onSwipeRight?: () => void, onSwipeLeft?: () => void }) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);

    const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart !== null) {
            const diff = e.targetTouches[0].clientX - touchStart;
            if (diff > 0 && onSwipeRight) setTranslateX(diff);
            if (diff < 0 && onSwipeLeft) setTranslateX(diff);
        }
    }

    const onTouchEnd = () => {
        if (translateX > 100 && onSwipeRight) {
            onSwipeRight();
        } else if (translateX < -100 && onSwipeLeft) {
             onSwipeLeft();
        } else {
            setTranslateX(0);
        }
        setTouchStart(null);
    }

    return (
        <div 
            className="bg-surface p-4 rounded-lg border border-gray-600 shadow-md relative z-10 select-none flex items-center justify-between"
            style={{ transform: `translateX(${translateX}px)` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
             <div className="text-gray-500 w-6">
                {onSwipeRight && <ArrowDownIcon />}
            </div>

            <div className="flex-grow flex items-center gap-3">
                 <span className="text-2xl">{parentTask?.icon}</span>
                 <div>
                     <p className="font-bold">{task.title}</p>
                     {task.description && <p className="text-xs text-gray-400">{task.description}</p>}
                 </div>
            </div>

            <div className="text-gray-500 w-6 flex justify-end">
                {onSwipeLeft && <ArrowUpIcon />}
            </div>
        </div>
    )
}

export default TasksView;
