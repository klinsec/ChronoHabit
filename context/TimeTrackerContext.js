
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { findBackupFile, uploadBackupFile, initGoogleDrive, signInToGoogle, setGapiToken } from '../utils/googleDrive.js';

const TimeTrackerContext = createContext(undefined);

const CLIENT_ID = '347833746217-of5l8r31t5csaqtqce7130raeisgidlv.apps.googleusercontent.com';

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
    if (diffDays <= 0) return 'today';
    else if (diffDays <= 7) return 'pending';
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

  // Cloud Sync States
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      const storedSubtasks = localStorage.getItem('chrono_subtasks');
      const storedLastDate = localStorage.getItem('chrono_last_access_date');
      const storedLastSync = localStorage.getItem('chrono_last_sync');
      const wasCloudConnected = localStorage.getItem('chrono_cloud_connected') === 'true';
      
      if (storedLastSync) setLastSyncTime(parseInt(storedLastSync));
      if (wasCloudConnected) setCloudStatus('connected');

      const todayString = new Date().toDateString();
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      else setTasks(defaultTasks);

      if (storedEntries) {
        const entries = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) setGoals(JSON.parse(storedGoals));

      if(storedSubtasks) {
        let parsedSubtasks = JSON.parse(storedSubtasks);
        parsedSubtasks = parsedSubtasks.map(s => ({ ...s, status: s.status || 'pending' }));
        parsedSubtasks = parsedSubtasks.map(s => {
            if (storedLastDate !== todayString && s.status === 'today' && s.completed) return { ...s, status: 'log' };
            if (s.deadline && !s.completed && s.status !== 'log') {
                 const newStatus = determineStatusFromDeadline(s.deadline, s.status);
                 if (newStatus !== s.status) {
                     if (newStatus === 'today' && s.status !== 'today') return { ...s, status: 'today' };
                     if (newStatus === 'pending' && s.status === 'idea') return { ...s, status: 'pending' };
                 }
            }
            return s;
        });
        if (storedLastDate !== todayString) localStorage.setItem('chrono_last_access_date', todayString);
        setSubtasks(parsedSubtasks);
      } else {
        localStorage.setItem('chrono_last_access_date', todayString);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      setTasks(defaultTasks);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => { localStorage.setItem('chrono_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('chrono_entries', JSON.stringify(timeEntries)); }, [timeEntries]);
  useEffect(() => { localStorage.setItem('chrono_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('chrono_subtasks', JSON.stringify(subtasks)); }, [subtasks]);

  const exportData = useCallback(() => {
    return JSON.stringify({ tasks, timeEntries, goals, subtasks, timestamp: Date.now(), version: 1 });
  }, [tasks, timeEntries, goals, subtasks]);

  const triggerCloudSync = useCallback(async () => {
    if (cloudStatus !== 'connected' && cloudStatus !== 'syncing') return;
    setCloudStatus('syncing');
    try {
        const data = exportData();
        const existingFile = await findBackupFile();
        await uploadBackupFile(data, existingFile?.id);
        const now = Date.now();
        setLastSyncTime(now);
        localStorage.setItem('chrono_last_sync', now.toString());
        setCloudStatus('connected');
    } catch (e) {
        console.error("Sync failed", e);
        setCloudStatus('error');
    }
  }, [cloudStatus, exportData]);

  // Periodic Auto-Sync if connected (every 10 minutes)
  useEffect(() => {
      if (cloudStatus === 'connected') {
          const interval = setInterval(triggerCloudSync, 600000);
          return () => clearInterval(interval);
      }
  }, [cloudStatus, triggerCloudSync]);

  useEffect(() => {
    let interval = null;
    if (activeEntry) {
      const updateElapsedTime = () => setLiveElapsedTime(Date.now() - activeEntry.startTime);
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 50);
    } else {
      setLiveElapsedTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeEntry]);

  const startTask = useCallback((taskId) => {
    const now = Date.now();
    let newEntries = [...timeEntries];
    const currentActiveIndex = newEntries.findIndex(e => e.endTime === null);
    if (currentActiveIndex > -1) newEntries[currentActiveIndex] = { ...newEntries[currentActiveIndex], endTime: now };
    const newEntry = { id: `entry_${now}`, taskId, startTime: now, endTime: null };
    newEntries.push(newEntry);
    setTimeEntries(newEntries);
    setActiveEntry(newEntry);
    
    // Auto sync trigger
    triggerCloudSync();

    if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const task = tasks.find(t => t.id === taskId);
        navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: 'ChronoHabit',
            options: { body: `Registrando: ${task?.name || 'Tarea'}`, icon: './icon-192.png', tag: 'timer-notification', renotify: true, silent: true, requireInteraction: true, actions: [{ action: 'stop-timer', title: 'Detener' }] }
        });
    }
  }, [timeEntries, tasks, triggerCloudSync]);
  
  const stopTask = useCallback(() => {
    if (activeEntry) {
      const now = Date.now();
      setTimeEntries(prev => prev.map(entry => entry.id === activeEntry.id ? { ...entry, endTime: now } : entry));
      setActiveEntry(null);
      triggerCloudSync();
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_NOTIFICATION', tag: 'timer-notification' });
      }
    }
  }, [activeEntry, triggerCloudSync]);

  const addTask = useCallback((newTask) => { setTasks(prev => [...prev, newTask]); triggerCloudSync(); }, [triggerCloudSync]);
  const updateTask = useCallback((updatedTask) => { setTasks(prev => prev.map(task => task.id === updatedTask.id ? updatedTask : task)); triggerCloudSync(); }, [triggerCloudSync]);
  const deleteTask = useCallback((taskId) => { if (window.confirm("¿Seguro?")) { setTasks(prev => prev.filter(task => task.id !== taskId)); setTimeEntries(prev => prev.filter(entry => entry.taskId !== taskId)); setSubtasks(prev => prev.filter(subtask => subtask.taskId !== taskId)); triggerCloudSync(); if (activeEntry?.taskId === taskId) setActiveEntry(null); } }, [activeEntry, triggerCloudSync]);
  const updateEntry = useCallback((updatedEntry) => { setTimeEntries(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)); if (updatedEntry.endTime === null) setActiveEntry(updatedEntry); triggerCloudSync(); }, [triggerCloudSync]);
  const deleteEntry = useCallback((entryId) => { setTimeEntries(prev => prev.filter(entry => entry.id !== entryId)); if (activeEntry?.id === entryId) setActiveEntry(null); triggerCloudSync(); }, [triggerCloudSync]);
  const setGoal = useCallback((goal) => { setGoals(prev => { const idx = prev.findIndex(g => g.taskId === goal.taskId && g.period === goal.period); if(idx > -1) { const n = [...prev]; n[idx] = goal; return n; } return [...prev, goal]; }); triggerCloudSync(); }, [triggerCloudSync]);
  const deleteGoal = useCallback((taskId, period) => { setGoals(prev => period ? prev.filter(g => !(g.taskId === taskId && g.period === period)) : prev.filter(g => g.taskId !== taskId)); triggerCloudSync(); }, [triggerCloudSync]);
  const addSubtask = useCallback((subtask) => { const id = `subtask_${Date.now()}`; const newS = { ...subtask, id, completed: false, createdAt: Date.now(), status: subtask.deadline ? determineStatusFromDeadline(subtask.deadline, 'idea') : 'idea' }; setSubtasks(prev => [newS, ...prev]); setLastAddedSubtaskId(id); triggerCloudSync(); }, [triggerCloudSync]);
  const updateSubtask = useCallback((s) => { setSubtasks(prev => prev.map(x => x.id === s.id ? s : x)); triggerCloudSync(); }, [triggerCloudSync]);
  const deleteSubtask = useCallback((id) => { setSubtasks(prev => prev.filter(s => s.id !== id)); triggerCloudSync(); }, [triggerCloudSync]);
  const toggleSubtaskCompletion = useCallback((id) => { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s)); triggerCloudSync(); }, [triggerCloudSync]);
  const moveSubtaskStatus = useCallback((id, status) => { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status } : s)); triggerCloudSync(); }, [triggerCloudSync]);

  const connectToCloud = useCallback(async () => {
      try {
          await initGoogleDrive(CLIENT_ID);
          await signInToGoogle();
          localStorage.setItem('chrono_cloud_connected', 'true');
          setCloudStatus('connected');
          await triggerCloudSync();
      } catch (err) {
          console.error("Cloud connection failed", err);
          setCloudStatus('error');
      }
  }, [triggerCloudSync]);

  const importData = useCallback((jsonData, skipConfirm = false) => {
    try {
        const backup = JSON.parse(jsonData);
        if (!Array.isArray(backup.tasks) || !Array.isArray(backup.timeEntries)) throw new Error("Format error");
        if (skipConfirm || window.confirm("¿Reemplazar datos locales?")) {
            setTasks(backup.tasks);
            setTimeEntries(backup.timeEntries);
            setGoals(backup.goals || []);
            setSubtasks(backup.subtasks || []);
            return true;
        }
        return false;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
  }, []);

  return React.createElement(TimeTrackerContext.Provider, { value: {
      tasks, timeEntries, goals, subtasks, activeEntry, liveElapsedTime, lastAddedSubtaskId,
      cloudStatus, lastSyncTime,
      addTask, updateTask, deleteTask, startTask, stopTask, updateEntry, deleteEntry,
      deleteAllData: () => { if(window.confirm("¿BORRAR TODO?")) { localStorage.clear(); window.location.reload(); } },
      getTaskById: (id) => tasks.find(t => t.id === id),
      setGoal, deleteGoal,
      getGoalByTaskIdAndPeriod: (id, p) => goals.find(g => g.taskId === id && g.period === p),
      addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus,
      requestNotificationPermission: async () => { if(Notification.permission !== 'granted') await Notification.requestPermission(); },
      exportData, importData, connectToCloud, triggerCloudSync
    }},
    children
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) throw new Error('useTimeTracker error');
  return context;
};
