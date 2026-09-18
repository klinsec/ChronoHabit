import { useState, useEffect, useCallback } from 'react';
import { Task } from '@/types';

const DEFAULT_TASKS: Task[] = [
    { id: 't_work', name: 'Trabajo', color: '#3b82f6', icon: '💼', satisfaction: 3 },
    { id: 't_project', name: 'Proyecto Personal', color: '#8b5cf6', icon: '🚀', satisfaction: 5 },
    { id: 't_sport', name: 'Deporte', color: '#10b981', icon: '💪', satisfaction: 5 },
    { id: 't_study', name: 'Estudio', color: '#f59e0b', icon: '📚', satisfaction: 5 },
    { id: 't_leisure', name: 'Ocio', color: '#ec4899', icon: '🎮', satisfaction: 10 },
    { id: 't_cleaning', name: 'Limpieza', color: '#6b7280', icon: '🧹', satisfaction: 5 }
];

export const useTasksState = () => {
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const saved = localStorage.getItem('tasks');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error("Error loading tasks:", e);
        }
        return DEFAULT_TASKS;
    });

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = useCallback((task: Task) => setTasks(prev => [...prev, task]), []);
    const updateTask = useCallback((task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t)), []);
    
    // Note: Deleting a task needs to cascade to subtasks and time entries.
    // This hook only manages the task array itself, so cascading logic must happen at the coordinator level.
    const removeTask = useCallback((taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId)), []);
    const getTaskById = useCallback((taskId: string) => tasks.find(t => t.id === taskId), [tasks]);

    return { tasks, setTasks, addTask, updateTask, removeTask, getTaskById };
};
