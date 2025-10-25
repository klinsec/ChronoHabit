import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { Subtask } from '../../types';

interface SubtaskModalProps {
  subtask: Subtask | null;
  onClose: () => void;
}

const SubtaskModal: React.FC<SubtaskModalProps> = ({ subtask, onClose }) => {
  const { tasks, addSubtask, updateSubtask } = useTimeTracker();
  
  const [title, setTitle] = useState(subtask?.title || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [taskId, setTaskId] = useState(subtask?.taskId || (tasks.length > 0 ? tasks[0].id : ''));

  const handleSubmit = (e: React.FormEvent) => {
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