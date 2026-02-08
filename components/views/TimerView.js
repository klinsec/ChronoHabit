
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { formatDuration } from '../../utils/helpers.js';
import TaskModal from '../modals/TaskModal.js';
import HistoryView from './HistoryView.js';
import { PlusIcon, EditIcon, HistoryIcon } from '../Icons.js';

const TimerView = () => {
  const { tasks, activeEntry, startTask, stopTask, getTaskById, liveElapsedTime } = useTimeTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeTask = activeEntry ? getTaskById(activeEntry.taskId) : null;

  const handleEditTask = (task) => {
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
    React.createElement('div', { className: "flex flex-col h-full relative" },
      // History Button
      React.createElement('div', { className: "absolute top-0 right-0 z-10" },
          React.createElement('button', 
            {
                onClick: () => setShowHistoryModal(true),
                className: "p-2 bg-surface text-gray-400 hover:text-white rounded-full shadow-md border border-gray-800 transition-colors",
                title: "Ver Historial"
            },
            React.createElement(HistoryIcon, null)
          )
      ),

      React.createElement('div', { className: "bg-surface p-6 rounded-2xl shadow-lg mb-6 text-center mt-8" },
        React.createElement('div', { className: "text-gray-400 text-sm mb-2" },
          activeTask ? `Registrando: ${activeTask.name}` : 'Ninguna tarea activa'
        ),
        React.createElement('div', { className: "text-5xl font-mono font-bold text-on-surface tracking-tighter" },
          formatDuration(liveElapsedTime, true)
        ),
        activeTask && (
             React.createElement('div', { className: "flex flex-col items-center" },
                React.createElement('div', { className: "mt-4 text-5xl", style: { filter: 'saturate(0.7)' } }, activeTask.icon),
                React.createElement('div', { className: "mt-6" },
                    React.createElement('button', 
                        { 
                            onClick: stopTask,
                            className: "bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 flex items-center justify-center mx-auto gap-2"
                        },
                        React.createElement('div', { className: "w-4 h-4 bg-white rounded-sm" }),
                        React.createElement('span', null, "Detener")
                    )
                )
             )
        )
      ),

      React.createElement('div', { className: "flex-grow overflow-y-auto" },
        React.createElement('div', { className: "flex justify-between items-center mb-4" },
            React.createElement('h2', { className: "text-xl font-semibold text-gray-200" }, "Tareas"),
            React.createElement('button',
                {
                  onClick: handleAddTask,
                  className: "flex items-center space-x-2 bg-primary text-bkg font-semibold px-4 py-2 rounded-lg hover:bg-purple-500 transition-colors"
                },
                React.createElement(PlusIcon, null),
                React.createElement('span', null, "Nueva Tarea")
            )
        ),
        React.createElement('div', { className: "grid grid-cols-2 gap-4" },
          tasks.map(task => (
            React.createElement('div', { key: task.id, className: "relative" },
              React.createElement('button',
                {
                  onClick: () => startTask(task.id),
                  className: `w-full h-32 p-4 rounded-2xl flex flex-col justify-between items-start text-left transition-all duration-200 shadow-md hover:shadow-xl focus:outline-none ${
                      activeEntry?.taskId === task.id ? 'ring-4 ring-offset-2 ring-offset-bkg' : 'ring-1 ring-gray-700'
                  }`,
                  style: { backgroundColor: task.color, color: '#ffffff' }
                },
                React.createElement('div', { className: "text-4xl", style: { filter: 'saturate(0.7)' } }, task.icon),
                React.createElement('span', { className: "font-bold text-lg" }, task.name)
              ),
              React.createElement('button',
                {
                  onClick: () => handleEditTask(task),
                  className: "absolute top-2 right-2 bg-black bg-opacity-30 rounded-full p-2 text-white hover:bg-opacity-50 transition-colors",
                  'aria-label': `Editar ${task.name}`
                },
                React.createElement(EditIcon, null)
              )
            )
          ))
        )
      ),
      
      isModalOpen && React.createElement(TaskModal, { task: editingTask, onClose: handleCloseModal }),
      
      showHistoryModal && React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col p-4 animate-in fade-in duration-200" },
          React.createElement('div', { className: "bg-surface rounded-2xl shadow-2xl border border-gray-700 flex flex-col max-h-full overflow-hidden flex-grow" },
              React.createElement('div', { className: "p-4 border-b border-gray-700 flex justify-end" },
                  React.createElement('button',
                    {
                        onClick: () => setShowHistoryModal(false),
                        className: "bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                    },
                    "Cerrar"
                  )
              ),
              React.createElement('div', { className: "flex-grow overflow-y-auto p-4" },
                  React.createElement(HistoryView, null)
              )
          )
      )
    )
  );
};

export default TimerView;
