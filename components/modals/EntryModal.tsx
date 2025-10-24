
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { TimeEntry } from '../../types';

interface EntryModalProps {
  entry: TimeEntry;
  onClose: () => void;
}

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose }) => {
  const { tasks, updateEntry } = useTimeTracker();
  const [taskId, setTaskId] = useState(entry.taskId);
  const [startTime, setStartTime] = useState(new Date(entry.startTime).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(entry.endTime ? new Date(entry.endTime).toISOString().slice(0, 16) : '');

  const handleSubmit = (e: React.FormEvent) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Editar Registro</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="entry-task" className="block text-sm font-medium text-gray-300 mb-1">Tarea</label>
            <select
              id="entry-task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
            >
              {tasks.map(task => (
                <option key={task.id} value={task.id}>{task.icon} {task.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="start-time" className="block text-sm font-medium text-gray-300 mb-1">Hora de Inicio</label>
            <input
              id="start-time"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="end-time" className="block text-sm font-medium text-gray-300 mb-1">Hora de Fin</label>
            <input
              id="end-time"
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;