
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
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [contract, setContract] = useState(null);

  // Cloud Sync States
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      const storedSubtasks = localStorage.getItem('chrono_subtasks');
      const storedContract = localStorage.getItem('chrono_contract');
      const storedLastDate = localStorage.getItem('chrono_last_access_date');
      const storedLastSync = localStorage.getItem('chrono_last_sync');
      const wasCloudConnected = localStorage.getItem('chrono_cloud_connected') === 'true';
      const storedDailyNotif = localStorage.getItem('chrono_daily_notif');
      
      if (storedLastSync) setLastSyncTime(parseInt(storedLastSync));
      if (wasCloudConnected) setCloudStatus('connected');
      if (storedDailyNotif !== null) setDailyNotificationEnabled(storedDailyNotif === 'true');

      const todayString = new Date().toISOString().split('T')[0];
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      else setTasks(defaultTasks);

      if (storedEntries) {
        const entries = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) setGoals(JSON.parse(storedGoals));

      if (storedContract) {
          const parsedContract = JSON.parse(storedContract);
          if (parsedContract.active && parsedContract.lastCheckDate !== todayString) {
              if (parsedContract.lastCheckDate) {
                  parsedContract.dayInPhase += 1;
              }
              parsedContract.lastCheckDate = todayString;
              parsedContract.commitments = parsedContract.commitments.map(c => ({...c, completedToday: false}));
          }
          setContract(parsedContract);
      }

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
  useEffect(() => { 
      if (contract) localStorage.setItem('chrono_contract', JSON.stringify(contract)); 
      else localStorage.removeItem('chrono_contract');
  }, [contract]);

  const toggleDailyNotification = useCallback(() => {
    setDailyNotificationEnabled(prev => {
        const newVal = !prev;
        localStorage.setItem('chrono_daily_notif', String(newVal));
        return newVal;
    });
  }, []);

  // Daily Notification Logic
  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const todayStr = now.toDateString();

        if (contract && contract.active && !contract.failed) {
            contract.commitments.forEach(comm => {
                if (comm.time === currentTimeStr && !comm.completedToday) {
                    const lastNotifKey = `notif_${comm.id}_${todayStr}`;
                    if (!localStorage.getItem(lastNotifKey)) {
                         if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker.controller) {
                             navigator.serviceWorker.controller.postMessage({
                                type: 'SHOW_NOTIFICATION',
                                title: '¡Es hora de cumplir!',
                                options: {
                                    body: `Contrato de Disciplina: ${comm.title}`,
                                    icon: './icon-192.png',
                                    tag: `contract-${comm.id}`,
                                    requireInteraction: true
                                }
                             });
                             localStorage.setItem(lastNotifKey, 'true');
                         }
                    }
                }
            });
        }

        if (dailyNotificationEnabled) {
            const lastNotifDate = localStorage.getItem('chrono_last_daily_notif_date');
            if (lastNotifDate !== todayStr && now.getHours() >= 8) {
                const todayTasks = subtasks.filter(s => s.status === 'today' && !s.completed);
                if (todayTasks.length > 0) {
                     if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker.controller) {
                         navigator.serviceWorker.controller.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: '🌅 Tu plan para hoy',
                            options: {
                                body: `Tienes ${todayTasks.length} tareas pendientes.`,
                                icon: './icon-192.png',
                                tag: 'daily-briefing'
                            }
                         });
                     }
                }
                localStorage.setItem('chrono_last_daily_notif_date', todayStr);
            }
        }
    }, 30000); 

    return () => clearInterval(interval);
  }, [dailyNotificationEnabled, subtasks, contract]);

  const exportData = useCallback(() => {
    return JSON.stringify({ tasks, timeEntries, goals, subtasks, contract, timestamp: Date.now(), version: 1 });
  }, [tasks, timeEntries, goals, subtasks, contract]);

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

  const startContract = useCallback((commitmentsData, duration) => {
      const newContract = {
          active: true,
          currentPhase: duration, 
          dayInPhase: 1,
          startDate: Date.now(),
          lastCheckDate: new Date().toISOString().split('T')[0],
          failed: false,
          history: [],
          commitments: commitmentsData.map((c, i) => ({
              ...c,
              id: `comm_${Date.now()}_${i}`,
              completedToday: false
          }))
      };
      setContract(newContract);
      triggerCloudSync();
  }, [triggerCloudSync]);

  const toggleCommitment = useCallback((id) => {
      setContract(prev => {
          if (!prev) return null;
          return {
              ...prev,
              commitments: prev.commitments.map(c => c.id === id ? { ...c, completedToday: !c.completedToday } : c)
          };
      });
      triggerCloudSync();
  }, [triggerCloudSync]);

  const resetContract = useCallback(() => {
      setContract(null); 
      triggerCloudSync();
  }, [triggerCloudSync]);

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
            if (backup.contract) setContract(backup.contract);
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
      cloudStatus, lastSyncTime, dailyNotificationEnabled, contract,
      addTask, updateTask, deleteTask, startTask, stopTask, updateEntry, deleteEntry,
      deleteAllData: () => { if(window.confirm("¿BORRAR TODO?")) { localStorage.clear(); window.location.reload(); } },
      getTaskById: (id) => tasks.find(t => t.id === id),
      setGoal, deleteGoal,
      getGoalByTaskIdAndPeriod: (id, p) => goals.find(g => g.taskId === id && g.period === p),
      addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus,
      requestNotificationPermission: async () => { if(Notification.permission !== 'granted') await Notification.requestPermission(); },
      toggleDailyNotification,
      exportData, importData, connectToCloud, triggerCloudSync,
      startContract, toggleCommitment, resetContract
    }},
    children
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) throw new Error('useTimeTracker error');
  return context;
};
