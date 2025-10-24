import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TimeTrackerContext = createContext(undefined);

const defaultTasks = [
  { id: '1', name: 'Trabajo', color: '#ef4444', icon: '💼' },
  { id: '2', name: 'Dormir', color: '#3b82f6', icon: '😴' },
  { id: '3', name: 'Ejercicio', color: '#22c55e', icon: '💪' },
  { id: '4', name: 'Ocio', color: '#eab308', icon: '🎮' },
];

export const TimeTrackerProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      
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
  }, [timeEntries]);
  
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
    if (window.confirm("¿Estás seguro? Eliminar una tarea también eliminará todos sus registros de tiempo y objetivos.")) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setTimeEntries(prev => prev.filter(entry => entry.taskId !== taskId));
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


  return React.createElement(TimeTrackerContext.Provider, { value: {
      tasks,
      timeEntries,
      goals,
      activeEntry,
      liveElapsedTime,
      addTask,
      updateTask,
      deleteTask,
      startTask,
      updateEntry,
      deleteEntry,
      getTaskById,
      setGoal,
      deleteGoal,
      getGoalByTaskIdAndPeriod,
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
