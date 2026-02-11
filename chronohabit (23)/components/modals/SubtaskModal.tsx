
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
          <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((starIndex) => {
                  const filledValue = starIndex * 2; // 2, 4, 6, 8, 10
                  const halfValue = filledValue - 1; // 1, 3, 5, 7, 9
                  
                  let fillPercentage = '0%';
                  if (difficulty >= filledValue) fillPercentage = '100%';
                  else if (difficulty >= halfValue) fillPercentage = '50%';

                  return (
                      <div 
                        key={starIndex} 
                        className="relative w-8 h-8 cursor-pointer group"
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
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">{subtask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subtask-title" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
            <input
              id="subtask-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="subtask-desc" className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
            <textarea
              id="subtask-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="subtask-parent" className="block text-sm font-medium text-gray-300 mb-1">Tarea Principal</label>
            <select
              id="subtask-parent"
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              required
            >
              <option value="" disabled>Selecciona una tarea...</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>{task.icon} {task.name}</option>
              ))}
            </select>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Dificultad (Puntos)</label>
             <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                 {renderStars()}
                 <p className="text-xs text-gray-400 mt-2 font-mono">
                     {difficulty} Puntos ({difficulty > 0 ? difficulty / 2 : 0} Estrellas)
                 </p>
             </div>
          </div>
          
          <div>
              <label htmlFor="subtask-date" className="block text-sm font-medium text-gray-300 mb-1">Fecha Límite (Opcional)</label>
              <input 
                id="subtask-date"
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Si la fecha está cerca, la tarea se moverá automáticamente a Pendientes o Hoy.</p>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg">{subtask ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubtaskModal;
