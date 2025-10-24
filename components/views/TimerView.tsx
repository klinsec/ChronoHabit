import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { formatDuration } from '../../utils/helpers';
import { Task } from '../../types';
import TaskModal from '../modals/TaskModal';
import { PlusIcon, EditIcon } from '../Icons';

const TimerView: React.FC = () => {
  const { tasks, activeEntry, startTask, getTaskById, liveElapsedTime } = useTimeTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    <div className="flex flex-col h-full">
      <div className="bg-surface p-6 rounded-2xl shadow-lg mb-6 text-center">
        <div className="text-gray-400 text-sm mb-2">
          {activeTask ? `Registrando: ${activeTask.name}` : 'Ninguna tarea activa'}
        </div>
        <div className="text-6xl font-mono font-bold text-on-surface tracking-tighter">
          {formatDuration(liveElapsedTime, true)}
        </div>
        {activeTask && (
             <div className="mt-4 text-5xl" style={{ filter: 'saturate(0.7)' }}>{activeTask.icon}</div>
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
    </div>
  );
};

export default TimerView;