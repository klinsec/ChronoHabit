
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TimeTrackerContext = createContext(undefined);

const defaultTasks = [
  { id: '1', name: 'Trabajo', color: '#ef4444', icon: '💼' },
  { id: '2', name: 'Ocio', color: '#eab308', icon: '🎮' },
  { id: '3', name: 'Ejercicio', color: '#22c55e', icon: '💪' },
  { id: '4', name: 'Proyecto personal', color: '#8b5cf6', icon: '🚀' },
  { id: '5', name: 'Limpieza', color: '#06b6d4', icon: '🧹' },
];

const determineStatusFromDeadline = (deadline, currentStatus) => {
    if (!deadline) return currentStatus;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const date = new Date(deadline);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
        return 'today';
    } else if (diffDays <= 7) {
        return 'pending';
    }
    
    return 'idea';
};

export const TimeTrackerProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [goals, setGoals] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState(null);

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
        const entries = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) {
        setGoals(JSON.parse(storedGoals));
      }

      if(storedSubtasks) {
        let parsedSubtasks = JSON.parse(storedSubtasks);
        parsedSubtasks = parsedSubtasks.map(s => ({
            ...s,
            status: s.status || 'pending'
        }));

        const now = new Date();
        now.setHours(0,0,0,0);

        parsedSubtasks = parsedSubtasks.map(s => {
            if (storedLastDate !== todayString && s.status === 'today' && s.completed) {
                return { ...s, status: 'log' };
            }

            if (s.deadline && !s.completed && s.status !== 'log') {
                 const newStatus = determineStatusFromDeadline(s.deadline, s.status);
                 if (newStatus !== s.status) {
                     if (newStatus === 'today' && s.status !== 'today') return { ...s, status: 'today' };
                     if (newStatus === 'pending' && s.status === 'idea') return { ...s, status: 'pending' };
                 }
            }
            return s;
        });

        if (storedLastDate !== todayString) {
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
    let interval = null;
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

  const startTask = useCallback((taskId) => {
    const now = Date.now();
    let newEntries = [...timeEntries];

    const currentActiveIndex = newEntries.findIndex(e => e.endTime === null);
    if (currentActiveIndex > -1) {
      newEntries[currentActiveIndex] = { ...newEntries[currentActiveIndex], endTime: now };
    }

    const newEntry = { id: `entry_${now}`, taskId, startTime: now, endTime: null };
    newEntries.push(newEntry);
    
    setTimeEntries(newEntries);
    setActiveEntry(newEntry);
    
    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const task = tasks.find(t => t.id === taskId);
        navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: 'ChronoHabit',
            options: {
                body: `Registrando: ${task?.name || 'Tarea'}`,
                icon: './icon-192.png',
                tag: 'timer-notification',
                renotify: true,
                silent: true,
                requireInteraction: true,
                actions: [{ action: 'stop-timer', title: 'Detener' }]
            }
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

      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'CANCEL_NOTIFICATION',
              tag: 'timer-notification'
          });
      }
    }
  }, [activeEntry]);

  useEffect(() => {
      const handleMessage = (event) => {
          if (event.data && event.data.type === 'STOP_TIMER') {
              stopTask();
          }
      };
      
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('message', handleMessage);
      }
      return () => {
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.removeEventListener('message', handleMessage);
          }
      }
  }, [stopTask]);
  
  const addTask = useCallback((newTask) => {
    setTasks(prev => [...prev, newTask]);
  }, []);

  const updateTask = useCallback((updatedTask) => {
    setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task));
  }, []);
  
  const deleteGoal = useCallback((taskId, period) => {
    setGoals(prev => {
        if (period) {
            return prev.filter(g => !(g.taskId === taskId && g.period === period));
        }
        return prev.filter(g => g.taskId !== taskId);
    });
  }, []);

  const deleteTask = useCallback((taskId) => {
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
  
  const updateEntry = useCallback((updatedEntry) => {
    setTimeEntries(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
    if (updatedEntry.endTime === null) {
      setActiveEntry(updatedEntry);
    }
  }, []);
  
  const deleteEntry = useCallback((entryId) => {
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

  const getTaskById = useCallback((taskId) => tasks.find(task => task.id === taskId), [tasks]);

  const setGoal = useCallback((goal) => {
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

  const getGoalByTaskIdAndPeriod = useCallback((taskId, period) => {
    return goals.find(g => g.taskId === taskId && g.period === period);
  }, [goals]);

  const addSubtask = useCallback((subtask) => {
    const id = `subtask_${Date.now()}`;
    let initialStatus = 'idea';
    if (subtask.deadline) {
        initialStatus = determineStatusFromDeadline(subtask.deadline, 'idea');
    }

    const newSubtask = {
      ...subtask,
      id: id,
      completed: false,
      createdAt: Date.now(),
      status: initialStatus
    };
    setSubtasks(prev => [newSubtask, ...prev]);
    setLastAddedSubtaskId(id);
  }, []);

  const updateSubtask = useCallback((updatedSubtask) => {
    setSubtasks(prev => prev.map(s => {
        if (s.id === updatedSubtask.id) {
            let newStatus = updatedSubtask.status;
            if (updatedSubtask.deadline) {
                const autoStatus = determineStatusFromDeadline(updatedSubtask.deadline, s.status);
                if (autoStatus === 'today') newStatus = 'today';
                else if (autoStatus === 'pending' && s.status === 'idea') newStatus = 'pending';
            }
            return { ...updatedSubtask, status: newStatus };
        }
        return s;
    }));
  }, []);

  const deleteSubtask = useCallback((subtaskId) => {
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  }, []);

  const toggleSubtaskCompletion = useCallback((subtaskId) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s));
  }, []);

  const moveSubtaskStatus = useCallback((subtaskId, status) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, status } : s));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    
    if (Notification.permission === 'granted') {
       alert("Las notificaciones ya están activadas.");
       if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: 'ChronoHabit',
              options: {
                  body: 'Las notificaciones funcionan correctamente.',
                  icon: './icon-192.png'
              }
          });
       }
       return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: 'Notificaciones Activadas',
              options: {
                  body: 'Ahora verás el cronómetro aquí.',
                  icon: './icon-192.png'
              }
          });
      }
    } else {
        alert("Permiso denegado. Por favor, habilítalo en la configuración de tu navegador.");
    }
  }, []);

  const exportData = useCallback(() => {
    const backup = {
        tasks,
        timeEntries,
        goals,
        subtasks,
        timestamp: Date.now(),
        version: 1
    };
    return JSON.stringify(backup);
  }, [tasks, timeEntries, goals, subtasks]);

  const importData = useCallback((jsonData) => {
    try {
        const backup = JSON.parse(jsonData);
        
        if (!Array.isArray(backup.tasks) || !Array.isArray(backup.timeEntries)) {
            throw new Error("Invalid backup format");
        }

        if (window.confirm("Esto reemplazará todos tus datos actuales con los del archivo de respaldo. ¿Estás seguro?")) {
            setTasks(backup.tasks);
            setTimeEntries(backup.timeEntries);
            setGoals(backup.goals || []);
            setSubtasks(backup.subtasks || []);
            
            localStorage.setItem('chrono_tasks', JSON.stringify(backup.tasks));
            localStorage.setItem('chrono_entries', JSON.stringify(backup.timeEntries));
            localStorage.setItem('chrono_goals', JSON.stringify(backup.goals || []));
            localStorage.setItem('chrono_subtasks', JSON.stringify(backup.subtasks || []));
            return true;
        }
        return false;
    } catch (e) {
        console.error("Import failed", e);
        alert("Error al importar el archivo. El formato no es válido.");
        return false;
    }
  }, []);

  return React.createElement(TimeTrackerContext.Provider, { value: {
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
      requestNotificationPermission,
      exportData,
      importData
    }},
    children
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};
