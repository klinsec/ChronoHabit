
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, TimeEntry, Goal, GoalPeriod, Subtask, SubtaskStatus } from '../types';

interface TimeTrackerContextType {
  tasks: Task[];
  timeEntries: TimeEntry[];
  goals: Goal[];
  subtasks: Subtask[];
  activeEntry: TimeEntry | null;
  liveElapsedTime: number;
  lastAddedSubtaskId: string | null;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  startTask: (taskId: string) => void;
  stopTask: () => void;
  updateEntry: (entry: TimeEntry) => void;
  deleteEntry: (entryId: string) => void;
  deleteAllData: () => void;
  getTaskById: (taskId: string) => Task | undefined;
  setGoal: (goal: Goal) => void;
  deleteGoal: (taskId: string, period?: GoalPeriod) => void;
  getGoalByTaskIdAndPeriod: (taskId: string, period: GoalPeriod) => Goal | undefined;
  addSubtask: (subtask: Omit<Subtask, 'id' | 'completed' | 'createdAt' | 'status'>) => void;
  updateSubtask: (subtask: Subtask) => void;
  deleteSubtask: (subtaskId: string) => void;
  toggleSubtaskCompletion: (subtaskId: string) => void;
  moveSubtaskStatus: (subtaskId: string, status: SubtaskStatus) => void;
  requestNotificationPermission: () => void;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

const defaultTasks: Task[] = [
  { id: '1', name: 'Trabajo', color: '#ef4444', icon: '💼' },
  { id: '2', name: 'Ocio', color: '#eab308', icon: '🎮' },
  { id: '3', name: 'Ejercicio', color: '#22c55e', icon: '💪' },
  { id: '4', name: 'Proyecto personal', color: '#8b5cf6', icon: '🚀' },
  { id: '5', name: 'Limpieza', color: '#06b6d4', icon: '🧹' },
];

export const TimeTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState<string | null>(null);

  // Auto-request on mount if permission is default (may be blocked by browser)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Test notification
          if ('serviceWorker' in navigator) {
             navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('ChronoHabit', {
                    body: 'Las notificaciones están activadas.',
                    icon: './icon-192.png'
                });
             });
          }
        }
      });
    } else {
        alert("Tu navegador no soporta notificaciones.");
    }
  }, []);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      const storedSubtasks = localStorage.getItem('chrono_subtasks');
      const storedLastDate = localStorage.getItem('chrono_last_access_date');
      
      const todayString = new Date().toDateString();

      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks(defaultTasks);
      }

      if (storedEntries) {
        const entries: TimeEntry[] = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) {
        setGoals(JSON.parse(storedGoals));
      }

      if(storedSubtasks) {
        let parsedSubtasks: Subtask[] = JSON.parse(storedSubtasks);
        
        // Migration logic: Ensure all subtasks have a status
        parsedSubtasks = parsedSubtasks.map(s => ({
            ...s,
            status: s.status || 'pending' // Default old tasks to pending
        }));

        // Rollover Logic: If new day, move completed 'today' tasks to 'log'
        if (storedLastDate !== todayString) {
             parsedSubtasks = parsedSubtasks.map(s => {
                 if (s.status === 'today' && s.completed) {
                     return { ...s, status: 'log' };
                 }
                 return s;
             });
             localStorage.setItem('chrono_last_access_date', todayString);
        }

        setSubtasks(parsedSubtasks);
      } else {
        localStorage.setItem('chrono_last_access_date', todayString);
      }

    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      setTasks(defaultTasks);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chrono_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error("Failed to save tasks to localStorage", e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('chrono_entries', JSON.stringify(timeEntries));
    } catch (e) {
      console.error("Failed to save time entries to localStorage", e);
    }
  }, [timeEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('chrono_goals', JSON.stringify(goals));
    } catch (e) {
      console.error("Failed to save goals to localStorage", e);
    }
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem('chrono_subtasks', JSON.stringify(subtasks));
    } catch (e) {
      console.error("Failed to save subtasks to localStorage", e);
    }
  }, [subtasks]);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeEntry) {
      const updateElapsedTime = () => {
        setLiveElapsedTime(Date.now() - activeEntry.startTime);
      };
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 50);
    } else {
      setLiveElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeEntry]);

  // Handle SW Messages for stopping timer
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'STOP_TIMER_FROM_SW') {
        // We need to call stopTask, but we need to ensure we have the latest state reference or use functional update if possible.
        // Since stopTask depends on activeEntry, and this effect runs when dependencies change, it should work if we include stopTask in deps.
        stopTask();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [activeEntry]); // Re-bind if activeEntry changes so stopTask has correct context

  const getTaskById = useCallback((taskId: string) => tasks.find(task => task.id === taskId), [tasks]);

  const startTask = useCallback((taskId: string) => {
    const now = Date.now();
    let newEntries = [...timeEntries];

    // Close existing active task if any
    const currentActiveIndex = newEntries.findIndex(e => e.endTime === null);
    if (currentActiveIndex > -1) {
      newEntries[currentActiveIndex] = { ...newEntries[currentActiveIndex], endTime: now };
    }

    const newEntry: TimeEntry = { id: `entry_${now}`, taskId, startTime: now, endTime: null };
    newEntries.push(newEntry);
    
    setTimeEntries(newEntries);
    setActiveEntry(newEntry);

    // Send Notification
    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      const task = tasks.find(t => t.id === taskId);
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification('ChronoHabit', {
          body: `Cronómetro activo: ${task ? task.name : 'Tarea'}`,
          icon: './icon-192.png',
          tag: 'timer-active',
          renotify: true,
          requireInteraction: true, // Keep notification visible on desktop
          actions: [
            { action: 'stop-timer', title: 'Detener', icon: './icon-192.png' } // Icon is optional/placeholder
          ]
        } as any);
      });
    }

  }, [timeEntries, tasks]);
  
  const stopTask = useCallback(() => {
    if (activeEntry) {
      const now = Date.now();
      setTimeEntries(prev => prev.map(entry => 
        entry.id === activeEntry.id ? { ...entry, endTime: now } : entry
      ));
      setActiveEntry(null);

      // Close Notification
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.getNotifications({ tag: 'timer-active' }).then(notifications => {
            notifications.forEach(notification => notification.close());
          });
        });
      }
    }
  }, [activeEntry]);

  const addTask = useCallback((newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
  }, []);
  
  const deleteGoal = useCallback((taskId: string, period?: GoalPeriod) => {
    setGoals(prev => {
        if (period) {
            return prev.filter(g => !(g.taskId === taskId && g.period === period));
        }
        return prev.filter(g => g.taskId !== taskId);
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    if (window.confirm("¿Estás seguro? Eliminar una tarea también eliminará todos sus registros de tiempo, objetivos y subtareas asociadas.")) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setTimeEntries(prev => prev.filter(entry => entry.taskId !== taskId));
      setSubtasks(prev => prev.filter(subtask => subtask.taskId !== taskId));
      deleteGoal(taskId);
      if (activeEntry?.taskId === taskId) {
        setActiveEntry(null);
      }
    }
  }, [activeEntry, deleteGoal]);
  
  const updateEntry = useCallback((updatedEntry: TimeEntry) => {
    setTimeEntries(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
    if (updatedEntry.endTime === null) {
      setActiveEntry(updatedEntry);
    }
  }, []);
  
  const deleteEntry = useCallback((entryId: string) => {
    setTimeEntries(prev => prev.filter(entry => entry.id !== entryId));
    if (activeEntry?.id === entryId) {
        setActiveEntry(null);
    }
  }, [activeEntry]);

  const deleteAllData = useCallback(() => {
    if (window.confirm("¿Estás seguro de que quieres borrar TODOS los datos? Esta acción es irreversible y recargará la aplicación.")) {
      try {
        localStorage.clear();
        window.location.reload();
      } catch (e) {
        console.error("Failed to delete data from localStorage", e);
        alert("Hubo un error al borrar los datos.");
      }
    }
  }, []);

  const setGoal = useCallback((goal: Goal) => {
    setGoals(prev => {
        const existingIndex = prev.findIndex(g => g.taskId === goal.taskId && g.period === goal.period);
        if(existingIndex > -1) {
            const newGoals = [...prev];
            newGoals[existingIndex] = goal;
            return newGoals;
        }
        return [...prev, goal];
    });
  }, []);

  const getGoalByTaskIdAndPeriod = useCallback((taskId: string, period: GoalPeriod) => {
    return goals.find(g => g.taskId === taskId && g.period === period);
  }, [goals]);
  
  const addSubtask = useCallback((subtask: Omit<Subtask, 'id' | 'completed' | 'createdAt' | 'status'>) => {
    const id = `subtask_${Date.now()}`;
    const newSubtask: Subtask = {
      ...subtask,
      id: id,
      completed: false,
      createdAt: Date.now(),
      status: 'idea' // Default to idea as requested
    };
    setSubtasks(prev => [newSubtask, ...prev]);
    setLastAddedSubtaskId(id);
  }, []);

  const updateSubtask = useCallback((updatedSubtask: Subtask) => {
    setSubtasks(prev => prev.map(s => s.id === updatedSubtask.id ? updatedSubtask : s));
  }, []);

  const deleteSubtask = useCallback((subtaskId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  }, []);

  const toggleSubtaskCompletion = useCallback((subtaskId: string) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s));
  }, []);

  const moveSubtaskStatus = useCallback((subtaskId: string, status: SubtaskStatus) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, status } : s));
  }, []);


  return (
    <TimeTrackerContext.Provider value={{
      tasks,
      timeEntries,
      goals,
      subtasks,
      activeEntry,
      liveElapsedTime,
      lastAddedSubtaskId,
      addTask,
      updateTask,
      deleteTask,
      startTask,
      stopTask,
      updateEntry,
      deleteEntry,
      deleteAllData,
      getTaskById,
      setGoal,
      deleteGoal,
      getGoalByTaskIdAndPeriod,
      addSubtask,
      updateSubtask,
      deleteSubtask,
      toggleSubtaskCompletion,
      moveSubtaskStatus,
      requestNotificationPermission
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};
