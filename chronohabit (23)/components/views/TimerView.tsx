
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { formatDuration } from '../../utils/helpers';
import { Task } from '../../types';
import TaskModal from '../modals/TaskModal';
import HistoryView from './HistoryView';
import { PlusIcon, EditIcon, HistoryIcon } from '../Icons';

const TimerView: React.FC = () => {
  const { tasks, activeEntry, startTask, stopTask, getTaskById, liveElapsedTime } = useTimeTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeTask = activeEntry ? getTaskById(activeEntry.taskId) : null;

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Bar for Timer View */}
      <div className="absolute top-0 right-0 z-10">
        <button 
            onClick={() => setShowHistoryModal(true)}
            className="p-2 bg-surface text-gray-400 hover:text-white rounded-full shadow-md border border-gray-800 transition-colors"
            title="Ver Historial"
        >
            <HistoryIcon />
        </button>
      </div>

      <div className="bg-surface p-6 rounded-2xl shadow-lg mb-6 text-center mt-8">
        <div className="text-gray-400 text-sm mb-2">
          {activeTask ? `Registrando: ${activeTask.name}` : 'Ninguna tarea activa'}
        </div>
        <div className="text-5xl font-mono font-bold text-on-surface tracking-tighter">
          {formatDuration(liveElapsedTime, true)}
        </div>
        {activeTask && (
             <div className="flex flex-col items-center">
                <div className="mt-4 text-5xl" style={{ filter: 'saturate(0.7)' }}>{activeTask.icon}</div>
                <div className="mt-6">
                    <button 
                        onClick={stopTask} 
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center mx-auto gap-2"
                    >
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                        <span>Detener</span>
                    </button>
                </div>
             </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Tareas</h2>
            <button
                onClick={handleAddTask}
                className="flex items-center space-x-2 bg-primary text-bkg font-semibold px-4 py-2 rounded-lg hover:bg-purple-500 transition-colors"
            >
                <PlusIcon />
                <span>Nueva Tarea</span>
            </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {tasks.map(task => (
            <div key={task.id} className="relative">
              <button
                onClick={() => startTask(task.id)}
                className={`w-full h-32 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-200 shadow-md hover:shadow-xl focus:outline-none ${
                    activeEntry?.taskId === task.id ? 'ring-4 ring-offset-2 ring-offset-bkg' : 'ring-1 ring-gray-700'
                }`}
                style={{ backgroundColor: task.color, color: '#ffffff' }}
              >
                <div className="text-4xl" style={{ filter: 'saturate(0.7)' }}>{task.icon}</div>
                <span className="font-bold text-lg">{task.name}</span>
              </button>
              <button
                onClick={() => handleEditTask(task)}
                className="absolute top-2 right-2 bg-black bg-opacity-30 rounded-full p-2 text-white hover:bg-opacity-50 transition-colors"
                aria-label={`Editar ${task.name}`}
              >
                <EditIcon />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {isModalOpen && <TaskModal task={editingTask} onClose={handleCloseModal} />}

      {/* History Modal Overlay */}
      {showHistoryModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 animate-in fade-in duration-200">
              <div className="bg-surface rounded-2xl shadow-2xl border border-gray-700 flex flex-col max-h-full overflow-hidden flex-grow">
                  <div className="p-4 border-b border-gray-700 flex justify-end">
                      <button 
                        onClick={() => setShowHistoryModal(false)}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                      >
                          Cerrar
                      </button>
                  </div>
                  <div className="flex-grow overflow-y-auto p-4">
                      <HistoryView />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TimerView;
