import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';

const EntryModal = ({ entry, onClose }) => {
  const { tasks, updateEntry } = useTimeTracker();
  const [taskId, setTaskId] = useState(entry.taskId);
  const [startTime, setStartTime] = useState(new Date(entry.startTime).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newStartTime = new Date(startTime).getTime();
    const newEndTime = endTime ? new Date(endTime).getTime() : null;

    if (newEndTime && newStartTime >= newEndTime) {
        alert("La hora de fin debe ser posterior a la hora de inicio.");
        return;
    }

    updateEntry({ ...entry, taskId, startTime: newStartTime, endTime: newEndTime });
    onClose();
  };

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm" },
        React.createElement('h2', { className: "text-xl font-bold mb-4" }, "Editar Registro"),
        React.createElement('form', { onSubmit: handleSubmit },
          React.createElement('div', { className: "mb-4" },
            React.createElement('label', { htmlFor: "entry-task", className: "block text-sm font-medium text-gray-300 mb-1" }, "Tarea"),
            React.createElement('select',
              {
                id: "entry-task",
                value: taskId,
                onChange: (e) => setTaskId(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              },
              tasks.map(task => (
                React.createElement('option', { key: task.id, value: task.id }, `${task.icon} ${task.name}`)
              ))
            )
          ),

          React.createElement('div', { className: "mb-4" },
            React.createElement('label', { htmlFor: "start-time", className: "block text-sm font-medium text-gray-300 mb-1" }, "Hora de Inicio"),
            React.createElement('input',
              {
                id: "start-time",
                type: "datetime-local",
                value: startTime,
                onChange: e => setStartTime(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              }
            )
          ),

          React.createElement('div', { className: "mb-6" },
            React.createElement('label', { htmlFor: "end-time", className: "block text-sm font-medium text-gray-300 mb-1" }, "Hora de Fin"),
            React.createElement('input',
              {
                id: "end-time",
                type: "datetime-local",
                value: endTime,
                onChange: e => setEndTime(e.target.value),
                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              }
            )
          ),
          
          React.createElement('div', { className: "flex justify-end space-x-2" },
            React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" }, "Cancelar"),
            React.createElement('button', { type: "submit", className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg" }, "Guardar Cambios")
          )
        )
      )
    )
  );
};

export default EntryModal;
