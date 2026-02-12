
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { Subtask } from '../../types';
import { StarIcon } from '../Icons';

interface SubtaskModalProps {
  subtask: Subtask | null;
  onClose: () => void;
}

const SubtaskModal: React.FC<SubtaskModalProps> = ({ subtask, onClose }) => {
  const { tasks, addSubtask, updateSubtask } = useTimeTracker();
  
  const [title, setTitle] = useState(subtask?.title || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [taskId, setTaskId] = useState(subtask?.taskId || (tasks.length > 0 ? tasks[0].id : ''));
  const [difficulty, setDifficulty] = useState(subtask?.difficulty !== undefined ? subtask.difficulty : 3); // Default 3 points
  
  // Format existing date to YYYY-MM-DD for input or empty string
  const formatDateForInput = (timestamp?: number) => {
      if (!timestamp) return '';
      return new Date(timestamp).toISOString().split('T')[0];
  };
  
  const [deadline, setDeadline] = useState(formatDateForInput(subtask?.deadline));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() === '' || taskId === '') {
        alert("El título y la tarea principal son obligatorios.");
        return;
    }
    
    // Parse Date
    let deadlineTimestamp: number | undefined = undefined;
    if (deadline) {
        const dateObj = new Date(deadline);
        // Set to noon to avoid timezone issues shifting the day
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

  // Helper for Star Rating (0-10 scale mapped to 5 stars with halves)
  const renderStars = () => {
      return (
          <div className="flex gap-0.5 sm:gap-1">
              {[1, 2, 3, 4, 5].map((starIndex) => {
                  const filledValue = starIndex * 2; // 2, 4, 6, 8, 10
                  const halfValue = filledValue - 1; // 1, 3, 5, 7, 9
                  
                  let fillPercentage = '0%';
                  if (difficulty >= filledValue) fillPercentage = '100%';
                  else if (difficulty >= halfValue) fillPercentage = '50%';

                  return (
                      <div 
                        key={starIndex} 
                        className="relative w-5 h-5 sm:w-6 sm:h-6 cursor-pointer group"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            if (x < rect.width / 2) {
                                setDifficulty(halfValue);
                            } else {
                                setDifficulty(filledValue);
                            }
                        }}
                      >
                          {/* Background Star (Empty) */}
                          <div className="absolute inset-0 text-gray-700">
                              <StarIcon />
                          </div>
                          {/* Foreground Star (Filled, clipped) */}
                          <div className="absolute inset-0 text-yellow-400 overflow-hidden transition-all duration-200" style={{ width: fillPercentage }}>
                              <StarIcon />
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold">{subtask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        </div>

        {/* Scrollable Form */}
        <div className="p-4 overflow-y-auto flex-grow">
            <form id="subtask-form" onSubmit={handleSubmit} className="space-y-3">
            <div>
                <label htmlFor="subtask-title" className="block text-xs font-medium text-gray-300 mb-1">Título</label>
                <input
                id="subtask-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm"
                required
                />
            </div>
            
            <div>
                <label htmlFor="subtask-desc" className="block text-xs font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                id="subtask-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm"
                rows={2}
                />
            </div>

            <div>
                <label htmlFor="subtask-parent" className="block text-xs font-medium text-gray-300 mb-1">Tarea Principal</label>
                <select
                id="subtask-parent"
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-primary focus:border-primary text-sm"
                required
                >
                <option value="" disabled>Selecciona una tarea...</option>
                {tasks.map(task => (
                    <option key={task.id} value={task.id}>{task.icon} {task.name}</option>
                ))}
                </select>
            </div>

            {/* Row for Difficulty and Date */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-300 mb-1">Dificultad</label>
                    <div className="flex items-center justify-center gap-1 bg-gray-800/50 p-1.5 rounded-lg border border-gray-700 h-[38px]">
                        {renderStars()}
                        <span className="text-sm font-bold font-mono text-primary ml-1 w-4 text-center">{difficulty}</span>
                    </div>
                </div>
                
                <div className="flex-1">
                    <label htmlFor="subtask-date" className="block text-xs font-medium text-gray-300 mb-1">Fecha Límite</label>
                    <input 
                        id="subtask-date"
                        type="date"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white focus:ring-primary focus:border-primary text-sm h-[38px]"
                    />
                </div>
            </div>
            
            <p className="text-[10px] text-gray-500 text-center leading-tight">
                Si la fecha está cerca, se organizará automáticamente.
            </p>
            </form>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end space-x-2 flex-shrink-0 bg-surface rounded-b-2xl">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg text-sm">Cancelar</button>
            <button type="submit" form="subtask-form" className="bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg text-sm">{subtask ? 'Guardar' : 'Crear'}</button>
        </div>

      </div>
    </div>
  );
};

export default SubtaskModal;
