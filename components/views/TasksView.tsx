import React, { useMemo, useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { Subtask } from '../../types';
import SubtaskModal from '../modals/SubtaskModal';
import { EditIcon, TrashIcon, PlusIcon } from '../Icons';

const TasksView: React.FC = () => {
  const { tasks, subtasks, toggleSubtaskCompletion, deleteSubtask } = useTimeTracker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const groupedSubtasks = useMemo(() => {
    const groups: { [key: string]: Subtask[] } = {};
    const sortedSubtasks = [...subtasks].sort((a, b) => a.createdAt - b.createdAt);
    
    sortedSubtasks.forEach(subtask => {
      if (!groups[subtask.taskId]) {
        groups[subtask.taskId] = [];
      }
      groups[subtask.taskId].push(subtask);
    });
    return groups;
  }, [subtasks]);

  const handleEdit = (subtask: Subtask) => {
    setEditingSubtask(subtask);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSubtask(null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSubtask(null);
  };
  
  const parentTasks = tasks.filter(task => groupedSubtasks[task.id]?.length > 0);

  return (
    <div className="relative h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-200">Lista de Tareas</h2>
        <div className="flex items-center">
            <label htmlFor="show-completed" className="text-sm text-gray-400 mr-2">Mostrar completadas</label>
            <input 
                type="checkbox" 
                id="show-completed"
                checked={showCompleted}
                onChange={() => setShowCompleted(!showCompleted)}
                className="form-checkbox h-4 w-4 text-primary bg-gray-800 border-gray-600 rounded focus:ring-primary"
            />
        </div>
      </div>
      <div className="space-y-6 pb-20">
        {parentTasks.length > 0 ? parentTasks.map(task => {
            const taskSubtasks = groupedSubtasks[task.id];
            const pending = taskSubtasks.filter(s => !s.completed);
            const completed = taskSubtasks.filter(s => s.completed);

            if (pending.length === 0 && (!showCompleted || completed.length === 0)) {
                return null;
            }

            return (
                <div key={task.id}>
                    <h3 className="text-lg font-semibold mb-2" style={{color: task.color}}>{task.icon} {task.name}</h3>
                    <div className="space-y-2">
                        {pending.map(subtask => (
                            <SubtaskItem key={subtask.id} subtask={subtask} onEdit={handleEdit} />
                        ))}
                        {showCompleted && completed.map(subtask => (
                            <SubtaskItem key={subtask.id} subtask={subtask} onEdit={handleEdit} />
                        ))}
                    </div>
                </div>
            )
        }) : (
            <div className="text-center py-16">
                <p className="text-gray-400 text-lg">Tu lista de tareas está vacía.</p>
                <p className="text-sm text-gray-500 mt-2">Usa el botón '+' para añadir tu primera tarea.</p>
            </div>
        )}
      </div>

      <button
        onClick={handleAdd}
        className="fixed bottom-28 right-4 bg-primary text-bkg rounded-full p-4 shadow-lg hover:bg-purple-500 transition-transform transform hover:scale-110"
        aria-label="Añadir nueva tarea"
      >
        <PlusIcon />
      </button>

      {isModalOpen && <SubtaskModal subtask={editingSubtask} onClose={handleCloseModal} />}
    </div>
  );
};

interface SubtaskItemProps {
    subtask: Subtask;
    onEdit: (subtask: Subtask) => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onEdit }) => {
    const { toggleSubtaskCompletion, deleteSubtask } = useTimeTracker();
    
    return (
        <div className={`bg-surface p-3 rounded-lg flex items-start transition-opacity duration-300 ${subtask.completed ? 'opacity-50' : ''}`}>
            <input 
                type="checkbox"
                checked={subtask.completed}
                onChange={() => toggleSubtaskCompletion(subtask.id)}
                className="form-checkbox h-5 w-5 mt-1 text-primary bg-gray-800 border-gray-600 rounded focus:ring-primary"
            />
            <div className="flex-grow mx-3">
                <p className={`font-semibold text-on-surface ${subtask.completed ? 'line-through' : ''}`}>{subtask.title}</p>
                <p className={`text-sm text-gray-400 ${subtask.completed ? 'line-through' : ''}`}>{subtask.description}</p>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => onEdit(subtask)} className="text-gray-400 hover:text-secondary p-1">
                    <EditIcon />
                </button>
                <button onClick={() => deleteSubtask(subtask.id)} className="text-gray-400 hover:text-red-500 p-1">
                    <TrashIcon />
                </button>
            </div>
        </div>
    )
}


export default TasksView;