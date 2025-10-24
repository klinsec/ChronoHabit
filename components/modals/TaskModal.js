import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';

const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'];
const icons = ['💼', '😴', '💪', '🎮', '📚', '🍳', '🧹', '🧘', '🎨', '🎵', '💬', '🛍️'];

const TaskModal = ({ task, onClose }) => {
  const { addTask, updateTask, deleteTask } = useTimeTracker();
  const [name, setName] = useState(task?.name || '');
  const [color, setColor] = useState(task?.color || colors[0]);
  const [icon, setIcon] = useState(task?.icon || icons[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() === '') return;

    const taskData = { name, color, icon };

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

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm overflow-y-auto max-h-screen" },
        React.createElement('h2', { className: "text-xl font-bold mb-4" }, task ? 'Editar Tarea' : 'Nueva Tarea'),
        React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
          React.createElement('div', null,
            React.createElement('label', { htmlFor: "task-name", className: "block text-sm font-medium text-gray-300 mb-1" }, "Nombre de la Tarea"),
            React.createElement('input',
              {
                id: "task-name",
                type: "text",
                value: name,
                onChange: e => setName(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary",
                required: true
              }
            )
          ),

          React.createElement('div', null,
             React.createElement('label', { className: "block text-sm font-medium text-gray-300 mb-1" }, "Icono"),
             React.createElement('div', { className: "grid grid-cols-6 gap-2 bg-gray-800 p-2 rounded-lg" },
                 icons.map(i => (
                     React.createElement('button', { type: "button", key: i, onClick: () => setIcon(i), className: `text-2xl rounded p-1 ${icon === i ? 'bg-primary' : 'hover:bg-gray-700'}` },
                         i
                     )
                 ))
             )
          ),
          
          React.createElement('div', null,
             React.createElement('label', { className: "block text-sm font-medium text-gray-300 mb-1" }, "Color"),
             React.createElement('div', { className: "flex flex-wrap gap-2" },
                 colors.map(c => (
                     React.createElement('button', { type: "button", key: c, onClick: () => setColor(c), className: `w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`, style: { backgroundColor: c } })
                 ))
             )
          ),
          
          React.createElement('div', { className: "flex justify-between items-center pt-4 border-t border-gray-700" },
            React.createElement('div', null,
              task && React.createElement('button', { type: "button", onClick: handleDelete, className: "text-red-500 hover:text-red-400 font-semibold px-4 py-2 rounded-lg" }, "Eliminar")
            ),
            React.createElement('div', { className: "flex space-x-2" },
              React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" }, "Cancelar"),
              React.createElement('button', { type: "submit", className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg" }, task ? 'Guardar' : 'Crear')
            )
          )
        )
      )
    )
  );
};

export default TaskModal;
