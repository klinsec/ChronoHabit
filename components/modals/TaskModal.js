
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { StarIcon } from '../Icons.js';

const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'];
const icons = ['💼', '😴', '💪', '🎮', '📚', '🍳', '🧹', '🧘', '🎨', '🎵', '💬', '🛍️'];

const TaskModal = ({ task, onClose }) => {
  const { addTask, updateTask, deleteTask } = useTimeTracker();
  const [name, setName] = useState(task?.name || '');
  const [color, setColor] = useState(task?.color || colors[0]);
  const [icon, setIcon] = useState(task?.icon || icons[0]);
  const [difficulty, setDifficulty] = useState(task?.difficulty || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() === '') return;

    const taskData = { name, color, icon, difficulty };

    if (task) {
      updateTask({ ...task, ...taskData });
    } else {
      addTask({ ...taskData, id: `task_${Date.now()}` });
    }

    onClose();
  };
  
  const handleDelete = () => {
    if (task) {
        deleteTask(task.id);
        onClose();
    }
  }

  const renderStars = () => {
      return (
          React.createElement('div', { className: "flex gap-1" },
              [1, 2, 3, 4, 5].map((starIndex) => {
                  const filledValue = starIndex * 2;
                  const halfValue = filledValue - 1;
                  
                  let fillPercentage = '0%';
                  if (difficulty >= filledValue) fillPercentage = '100%';
                  else if (difficulty >= halfValue) fillPercentage = '50%';

                  return (
                      React.createElement('div', 
                        {
                            key: starIndex,
                            className: "relative w-8 h-8 cursor-pointer group",
                            onClick: (e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                if (x < rect.width / 2) {
                                    setDifficulty(halfValue);
                                } else {
                                    setDifficulty(filledValue);
                                }
                            }
                        },
                          React.createElement('div', { className: "absolute inset-0 text-gray-700" }, React.createElement(StarIcon, null)),
                          React.createElement('div', { className: "absolute inset-0 text-yellow-400 overflow-hidden transition-all duration-200", style: { width: fillPercentage } }, React.createElement(StarIcon, null))
                      )
                  );
              })
          )
      );
  };

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]" },
        
        /* Header */
        React.createElement('div', { className: "p-4 border-b border-gray-700 flex-shrink-0" },
            React.createElement('h2', { className: "text-lg font-bold" }, task ? 'Editar Tarea' : 'Nueva Tarea')
        ),

        /* Scrollable Content */
        React.createElement('div', { className: "p-4 overflow-y-auto flex-grow" },
            React.createElement('form', { id: "task-form", onSubmit: handleSubmit, className: "space-y-4" },
            React.createElement('div', null,
                React.createElement('label', { htmlFor: "task-name", className: "block text-xs font-medium text-gray-300 mb-1" }, "Nombre"),
                React.createElement('input',
                {
                    id: "task-name",
                    type: "text",
                    value: name,
                    onChange: e => setName(e.target.value),
                    className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm",
                    required: true,
                    autoFocus: !task
                }
                )
            ),

            React.createElement('div', null,
                React.createElement('label', { className: "block text-xs font-medium text-gray-300 mb-1" }, "Icono"),
                React.createElement('div', { className: "grid grid-cols-6 gap-2 bg-gray-800 p-2 rounded-lg" },
                    icons.map(i => (
                        React.createElement('button', { type: "button", key: i, onClick: () => setIcon(i), className: `text-xl rounded p-1 ${icon === i ? 'bg-primary' : 'hover:bg-gray-700'}` },
                            i
                        )
                    ))
                )
            ),
            
            React.createElement('div', null,
                React.createElement('label', { className: "block text-xs font-medium text-gray-300 mb-1" }, "Satisfacción (Puntos)"),
                React.createElement('div', { className: "bg-gray-800 p-2 rounded-lg flex flex-col items-center" },
                    renderStars(),
                    React.createElement('p', { className: "text-[10px] text-gray-400 mt-1 font-mono" }, 
                        difficulty > 0 ? `${difficulty / 2} Estrellas (${difficulty} pts)` : 'Sin dificultad'
                    )
                )
            ),
            
            React.createElement('div', null,
                React.createElement('label', { className: "block text-xs font-medium text-gray-300 mb-1" }, "Color"),
                React.createElement('div', { className: "flex flex-wrap gap-2" },
                    colors.map(c => (
                        React.createElement('button', { type: "button", key: c, onClick: () => setColor(c), className: `w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`, style: { backgroundColor: c } })
                    ))
                )
            )
            )
        ),
        
        /* Footer */
        React.createElement('div', { className: "p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0 bg-surface rounded-b-2xl" },
            React.createElement('div', null,
            task && React.createElement('button', { type: "button", onClick: handleDelete, className: "text-red-500 hover:text-red-400 font-semibold text-xs px-3 py-2" }, "Eliminar")
            ),
            React.createElement('div', { className: "flex space-x-2" },
            React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-1.5 px-3 rounded-lg text-sm" }, "Cancelar"),
            React.createElement('button', { type: "submit", form: "task-form", className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-1.5 px-3 rounded-lg text-sm" }, task ? 'Guardar' : 'Crear')
            )
        )
      )
    )
  );
};

export default TaskModal;
