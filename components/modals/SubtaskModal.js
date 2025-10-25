import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';

const SubtaskModal = ({ subtask, onClose }) => {
  const { tasks, addSubtask, updateSubtask } = useTimeTracker();
  
  const [title, setTitle] = useState(subtask?.title || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [taskId, setTaskId] = useState(subtask?.taskId || (tasks.length > 0 ? tasks[0].id : ''));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() === '' || taskId === '') {
        alert("El título y la tarea principal son obligatorios.");
        return;
    }

    const subtaskData = { title, description, taskId };

    if (subtask) {
      updateSubtask({ ...subtask, ...subtaskData });
    } else {
      addSubtask(subtaskData);
    }

    onClose();
  };
  
  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm" },
        React.createElement('h2', { className: "text-xl font-bold mb-4" }, subtask ? 'Editar Tarea' : 'Nueva Tarea'),
        React.createElement('form', { onSubmit: handleSubmit, className: "space-y-4" },
          React.createElement('div', null,
            React.createElement('label', { htmlFor: "subtask-title", className: "block text-sm font-medium text-gray-300 mb-1" }, "Título"),
            React.createElement('input',
              {
                id: "subtask-title",
                type: "text",
                value: title,
                onChange: e => setTitle(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary",
                required: true
              }
            )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { htmlFor: "subtask-desc", className: "block text-sm font-medium text-gray-300 mb-1" }, "Descripción"),
            React.createElement('textarea',
              {
                id: "subtask-desc",
                value: description,
                onChange: e => setDescription(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary",
                rows: 3
              }
            )
          ),

          React.createElement('div', null,
            React.createElement('label', { htmlFor: "subtask-parent", className: "block text-sm font-medium text-gray-300 mb-1" }, "Tarea Principal"),
            React.createElement('select',
              {
                id: "subtask-parent",
                value: taskId,
                onChange: e => setTaskId(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary",
                required: true
              },
              React.createElement('option', { value: "", disabled: true }, "Selecciona una tarea..."),
              tasks.map(task => (
                React.createElement('option', { key: task.id, value: task.id }, `${task.icon} ${task.name}`)
              ))
            )
          ),
          
          React.createElement('div', { className: "flex justify-end space-x-2 pt-4 border-t border-gray-700" },
            React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg" }, subtask ? 'Guardar' : 'Crear')
          )
        )
      )
    )
  );
};

export default SubtaskModal;