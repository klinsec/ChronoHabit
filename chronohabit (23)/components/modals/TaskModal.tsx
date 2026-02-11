
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { Task } from '../../types';
import { StarIcon } from '../Icons';

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
}

const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899'];
const icons = ['💼', '😴', '💪', '🎮', '📚', '🍳', '🧹', '🧘', '🎨', '🎵', '💬', '🛍️'];

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const { addTask, updateTask, deleteTask } = useTimeTracker();
  const [name, setName] = useState(task?.name || '');
  const [color, setColor] = useState(task?.color || colors[0]);
  const [icon, setIcon] = useState(task?.icon || icons[0]);
  const [difficulty, setDifficulty] = useState(task?.difficulty || 0); // 0-10 scale

  const handleSubmit = (e: React.FormEvent) => {
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
                            // Smart click: Get bounding rect to see if click was on left or right half
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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 p-0 sm:p-4 flex items-end sm:items-center justify-center">
      <div className="bg-surface rounded-t-2xl sm:rounded-2xl p-4 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border-t sm:border border-gray-700">
        <h2 className="text-xl font-bold mb-4">{task ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Tarea</label>
            <input
              id="task-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
              required
              autoFocus={!task}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Icono</label>
             <div className="grid grid-cols-6 gap-2 bg-gray-800 p-2 rounded-lg">
                 {icons.map(i => (
                     <button type="button" key={i} onClick={() => setIcon(i)} className={`text-2xl rounded p-1 ${icon === i ? 'bg-primary' : 'hover:bg-gray-700'}`}>
                         {i}
                     </button>
                 ))}
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Dificultad (Satisfacción)</label>
             <div className="bg-gray-800 p-3 rounded-lg flex flex-col items-center">
                 {renderStars()}
                 <p className="text-xs text-gray-400 mt-2 font-mono">
                     {difficulty > 0 ? `${difficulty / 2} Estrellas (${difficulty} pts)` : 'Sin dificultad'}
                 </p>
             </div>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
             <div className="flex flex-wrap gap-2">
                 {colors.map(c => (
                     <button type="button" key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`} style={{ backgroundColor: c }} />
                 ))}
             </div>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <div>
              {task && <button type="button" onClick={handleDelete} className="text-red-500 hover:text-red-400 font-semibold px-4 py-2 rounded-lg">Eliminar</button>}
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
              <button type="submit" className="bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg">{task ? 'Guardar' : 'Crear'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
