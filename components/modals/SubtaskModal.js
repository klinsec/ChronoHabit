
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';

const SubtaskModal = ({ subtask, onClose }) => {
  const { tasks, addSubtask, updateSubtask } = useTimeTracker();
  
  const formatDateForInput = (timestamp) => {
      if (!timestamp) return '';
      return new Date(timestamp).toISOString().split('T')[0];
  };

  const [title, setTitle] = useState(subtask?.title || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [taskId, setTaskId] = useState(subtask?.taskId || (tasks.length > 0 ? tasks[0].id : ''));
  const [deadline, setDeadline] = useState(formatDateForInput(subtask?.deadline));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() === '' || taskId === '') {
        alert("El título y la tarea principal son obligatorios.");
        return;
    }

    let deadlineTimestamp = undefined;
    if (deadline) {
        const dateObj = new Date(deadline);
        dateObj.setHours(12, 0, 0, 0);
        deadlineTimestamp = dateObj.getTime();
    }

    const subtaskData = { title, description, taskId, deadline: deadlineTimestamp };

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

          React.createElement('div', null,
              React.createElement('label', { htmlFor: "subtask-date", className: "block text-sm font-medium text-gray-300 mb-1" }, "Fecha Límite (Opcional)"),
              React.createElement('input', 
                {
                    id: "subtask-date",
                    type: "date",
                    value: deadline,
                    onChange: e => setDeadline(e.target.value),
                    className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
                }
              ),
              React.createElement('p', { className: "text-xs text-gray-500 mt-1" }, "Si la fecha está cerca, la tarea se moverá automáticamente a Pendientes o Hoy.")
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
