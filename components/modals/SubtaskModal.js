
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { StarIcon } from '../Icons.js';

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
  const [difficulty, setDifficulty] = useState(subtask?.difficulty !== undefined ? subtask.difficulty : 3);

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

    const subtaskData = { title, description, taskId, deadline: deadlineTimestamp, difficulty };

    if (subtask) {
      updateSubtask({ ...subtask, ...subtaskData });
    } else {
      addSubtask(subtaskData);
    }

    onClose();
  };

  const renderStars = () => {
      return (
          React.createElement('div', { className: "flex gap-0.5 sm:gap-1" },
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
                            className: "relative w-5 h-5 sm:w-6 sm:h-6 cursor-pointer group",
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
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]" },
        
        /* Header */
        React.createElement('div', { className: "p-4 border-b border-gray-700 flex-shrink-0" },
            React.createElement('h2', { className: "text-xl font-bold" }, subtask ? 'Editar Tarea' : 'Nueva Tarea')
        ),

        /* Scrollable Form */
        React.createElement('div', { className: "p-4 overflow-y-auto flex-grow" },
            React.createElement('form', { id: "subtask-form", onSubmit: handleSubmit, className: "space-y-3" },
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: "subtask-title", className: "block text-xs font-medium text-gray-300 mb-1" }, "Título"),
                    React.createElement('input',
                    {
                        id: "subtask-title",
                        type: "text",
                        value: title,
                        onChange: e => setTitle(e.target.value),
                        className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm",
                        required: true
                    })
                ),
                
                React.createElement('div', null,
                    React.createElement('label', { htmlFor: "subtask-desc", className: "block text-xs font-medium text-gray-300 mb-1" }, "Descripción"),
                    React.createElement('textarea',
                    {
                        id: "subtask-desc",
                        value: description,
                        onChange: e => setDescription(e.target.value),
                        className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm",
                        rows: 2
                    })
                ),

                React.createElement('div', null,
                    React.createElement('label', { htmlFor: "subtask-parent", className: "block text-xs font-medium text-gray-300 mb-1" }, "Tarea Principal"),
                    React.createElement('select',
                    {
                        id: "subtask-parent",
                        value: taskId,
                        onChange: e => setTaskId(e.target.value),
                        className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm",
                        required: true
                    },
                    React.createElement('option', { value: "", disabled: true }, "Selecciona una tarea..."),
                    tasks.map(task => (
                        React.createElement('option', { key: task.id, value: task.id }, `${task.icon} ${task.name}`)
                    ))
                    )
                ),

                /* Combined Row */
                React.createElement('div', { className: "flex gap-3" },
                    React.createElement('div', { className: "flex-1" },
                        React.createElement('label', { className: "block text-xs font-medium text-gray-300 mb-1" }, "Dificultad"),
                        React.createElement('div', { className: "flex items-center justify-center gap-1 bg-gray-800/50 p-1.5 rounded-lg border border-gray-700 h-[38px]" },
                            renderStars(),
                            React.createElement('span', { className: "text-sm font-bold font-mono text-primary ml-1 w-4 text-center" }, difficulty)
                        )
                    ),
                    React.createElement('div', { className: "flex-1" },
                        React.createElement('label', { htmlFor: "subtask-date", className: "block text-xs font-medium text-gray-300 mb-1" }, "Fecha Límite"),
                        React.createElement('input', 
                            {
                                id: "subtask-date",
                                type: "date",
                                value: deadline,
                                onChange: e => setDeadline(e.target.value),
                                className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white focus:ring-primary focus:border-primary text-sm h-[38px]"
                            }
                        )
                    )
                ),
                
                React.createElement('p', { className: "text-[10px] text-gray-500 text-center leading-tight" }, "Si la fecha está cerca, se organizará automáticamente.")
            )
        ),
        
        /* Footer */
        React.createElement('div', { className: "p-4 border-t border-gray-700 flex justify-end space-x-2 flex-shrink-0 bg-surface rounded-b-2xl" },
            React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm" }, "Cancelar"),
            React.createElement('button', { type: "submit", form: "subtask-form", className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg text-sm" }, subtask ? 'Guardar' : 'Crear')
        )
      )
    )
  );
};

export default SubtaskModal;
