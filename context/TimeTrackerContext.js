
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { findBackupFile, uploadBackupFile, initGoogleDrive, signInToGoogle } from '../utils/googleDrive.js';

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
  
  // Notification Config
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [briefingTime, setBriefingTime] = useState("09:00");
  const [reviewTime, setReviewTime] = useState("23:00");

  const [contract, setContract] = useState(null);
  const [pastContracts, setPastContracts] = useState([]);
  const [savedRoutines, setSavedRoutines] = useState([]);

  // Cloud Sync States
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Helper
  const archiveContract = useCallback((finishedContract, status) => {
      setPastContracts(prev => {
          const newItem = {
              id: `hist_${Date.now()}`,
              startDate: finishedContract.startDate,
              endDate: Date.now(),
              phaseDuration: finishedContract.currentPhase,
              status: status,
              commitmentsSnapshot: finishedContract.commitments.map(c => c.title)
          };
          return [newItem, ...prev].slice(0, 6);
      });
  }, []);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      const storedSubtasks = localStorage.getItem('chrono_subtasks');
      const storedContract = localStorage.getItem('chrono_contract');
      const storedHistory = localStorage.getItem('chrono_contract_history');
      const storedRoutines = localStorage.getItem('chrono_saved_routines');
      const storedLastDate = localStorage.getItem('chrono_last_access_date');
      const storedLastSync = localStorage.getItem('chrono_last_sync');
      const wasCloudConnected = localStorage.getItem('chrono_cloud_connected') === 'true';
      const storedDailyNotif = localStorage.getItem('chrono_daily_notif');
      const storedBriefing = localStorage.getItem('chrono_briefing_time');
      const storedReview = localStorage.getItem('chrono_review_time');
      
      if (storedLastSync) setLastSyncTime(parseInt(storedLastSync));
      if (wasCloudConnected) setCloudStatus('connected');
      if (storedDailyNotif !== null) setDailyNotificationEnabled(storedDailyNotif === 'true');
      if (storedBriefing) setBriefingTime(storedBriefing);
      if (storedReview) setReviewTime(storedReview);

      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const currentDayOfWeek = today.getDay();

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
          
          // Data Migration
          parsedContract.commitments = parsedContract.commitments.map(c => {
              if (c.completedToday !== undefined) {
                  return { ...c, status: c.completedToday ? 'completed' : 'pending' };
              }
              return c;
          });

          // Daily Reset Logic with Grace Period
          if (parsedContract.active && parsedContract.lastCheckDate !== todayString) {
              const now = new Date();
              const hour = now.getHours();
              
              if (hour >= 1) {
                  const lastDate = new Date(parsedContract.lastCheckDate);
                  const isLastDateAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(lastDate.getDay());
                  
                  let failed = false;
                  
                  if (isLastDateAllowed) {
                      const anyFailedOrPending = parsedContract.commitments.some(c => c.status !== 'completed');
                      if (anyFailedOrPending) {
                          failed = true;
                      }
                  }

                  if (failed) {
                      archiveContract(parsedContract, 'failed');
                      setContract(null);
                  } else {
                      parsedContract.lastCheckDate = todayString;
                      const isTodayAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(currentDayOfWeek);

                      if (isTodayAllowed) {
                          if (parsedContract.lastCheckDate) {
                              parsedContract.dayInPhase += 1;
                          }
                          parsedContract.commitments = parsedContract.commitments.map(c => ({...c, status: 'pending'}));
                      }
                      setContract(parsedContract);
                  }
              } else {
                  setContract(parsedContract);
              }
          } else {
              setContract(parsedContract);
          }
      }
      
      if (storedHistory) {
          setPastContracts(JSON.parse(storedHistory));
      }

      if (storedRoutines) {
          setSavedRoutines(JSON.parse(storedRoutines));
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
  useEffect(() => { localStorage.setItem('chrono_contract_history', JSON.stringify(pastContracts)); }, [pastContracts]);
  useEffect(() => { localStorage.setItem('chrono_saved_routines', JSON.stringify(savedRoutines)); }, [savedRoutines]);

  // --- Export Data ---
  const exportData = useCallback(() => {
    return JSON.stringify({ 
        tasks, 
        timeEntries, 
        goals, 
        subtasks, 
        contract,
        contractHistory: pastContracts,
        savedRoutines: savedRoutines,
        settings: { 
            dailyNotificationEnabled,
            briefingTime,
            reviewTime
        },
        timestamp: Date.now(), 
        version: 1 
    });
  }, [tasks, timeEntries, goals, subtasks, contract, pastContracts, savedRoutines, dailyNotificationEnabled, briefingTime, reviewTime]);

  // --- Trigger Sync ---
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

  // --- Toggle Notification ---
  const toggleDailyNotification = useCallback(() => {
    setDailyNotificationEnabled(prev => {
        const newVal = !prev;
        localStorage.setItem('chrono_daily_notif', String(newVal));
        if(cloudStatus==='connected') triggerCloudSync();
        return newVal;
    });
  }, [cloudStatus, triggerCloudSync]); 

  const setNotificationTimes = useCallback((briefing, review) => {
      setBriefingTime(briefing);
      setReviewTime(review);
      localStorage.setItem('chrono_briefing_time', briefing);
      localStorage.setItem('chrono_review_time', review);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  // --- Main Notification Logic ---
  useEffect(() => {
    if (!dailyNotificationEnabled) return;

    const interval = setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const currentDayOfWeek = now.getDay();
        const currentTimeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const todayStr = now.toDateString();

        if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker.controller) {
            return;
        }

        const isContractDay = contract && contract.active && !contract.failed && (!contract.allowedDays || contract.allowedDays.includes(currentDayOfWeek));

        // 1. Contract Specific Time
        if (isContractDay) {
            contract.commitments.forEach(comm => {
                if (comm.time === currentTimeStr && comm.status === 'pending') {
                    const lastNotifKey = `notif_comm_${comm.id}_${todayStr}`;
                    if (!localStorage.getItem(lastNotifKey)) {
                         navigator.serviceWorker.controller.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: '¡Es hora de cumplir!',
                            options: {
                                body: `Rutina: ${comm.title}`,
                                icon: './icon-192.png',
                                tag: `contract-${comm.id}`,
                                requireInteraction: true
                            }
                         });
                         localStorage.setItem(lastNotifKey, 'true');
                    }
                }
            });
        }

        // 2. Daily Briefing
        if (currentTimeStr === briefingTime) {
            const lastNotifKey = `notif_briefing_${todayStr}`;
            if (!localStorage.getItem(lastNotifKey)) {
                const todayTasks = subtasks.filter(s => s.status === 'today' && !s.completed);
                if (todayTasks.length > 0) {
                     const items = todayTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
                     const remaining = todayTasks.length - 3;
                     const body = items + (remaining > 0 ? `\n...y ${remaining} más.` : '');

                     navigator.serviceWorker.controller.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        title: `📅 Plan para hoy (${todayTasks.length})`,
                        options: {
                            body: body,
                            icon: './icon-192.png',
                            tag: 'daily-briefing'
                        }
                     });
                }
                localStorage.setItem(lastNotifKey, 'true');
            }
        }

        // 3. End of Day Review
        if (currentTimeStr === reviewTime) {
            const lastNotifKey = `notif_review_${todayStr}`;
            if (!localStorage.getItem(lastNotifKey)) {
                if (isContractDay) {
                    const incompleteCount = contract.commitments.filter(c => c.status !== 'completed').length;
                    if (incompleteCount > 0) {
                        navigator.serviceWorker.controller.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: '¿Completaste tu rutina?',
                            options: {
                                body: `Te faltan ${incompleteCount} compromisos. ¡No rompas la cadena!`,
                                icon: './icon-192.png',
                                tag: 'nightly-review',
                                requireInteraction: true
                            }
                        });
                    }
                }
                localStorage.setItem(lastNotifKey, 'true');
            }
        }
        
        // 4. Grace Period Warning
        if (hour === 0 && currentTimeStr === "00:00") {
             const lastNotifKey = `notif_grace_${todayStr}`;
             const yesterday = new Date(now);
             yesterday.setDate(now.getDate() - 1);
             const yesterdayDay = yesterday.getDay();
             const wasContractDay = contract && contract.active && (!contract.allowedDays || contract.allowedDays.includes(yesterdayDay));

             if (wasContractDay && !localStorage.getItem(lastNotifKey)) {
                 const incompleteCount = contract.commitments.filter(c => c.status !== 'completed').length;
                 if (incompleteCount > 0) {
                     navigator.serviceWorker.controller.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        title: '⚠️ ÚLTIMA OPORTUNIDAD',
                        options: {
                            body: `Tienes 1 hora para marcar tus rutinas o el contrato fallará.`,
                            icon: './icon-192.png',
                            tag: 'grace-period',
                            requireInteraction: true
                        }
                     });
                     localStorage.setItem(lastNotifKey, 'true');
                 }
             }
        }

    }, 20000); 

    return () => clearInterval(interval);
  }, [dailyNotificationEnabled, subtasks, contract, briefingTime, reviewTime]);

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

  const startContract = useCallback((commitmentsData, duration, allowedDays = [0,1,2,3,4,5,6]) => {
      if (contract) {
          archiveContract(contract, 'completed');
      }

      const newContract = {
          active: true,
          currentPhase: duration, 
          dayInPhase: 1,
          startDate: Date.now(),
          lastCheckDate: new Date().toISOString().split('T')[0],
          failed: false,
          history: [],
          allowedDays,
          commitments: commitmentsData.map((c, i) => ({
              ...c,
              id: `comm_${Date.now()}_${i}`,
              status: 'pending'
          }))
      };
      setContract(newContract);
      triggerCloudSync();
  }, [contract, triggerCloudSync, archiveContract]);

  const setCommitmentStatus = useCallback((id, status) => {
      setContract(prev => {
          if (!prev) return null;
          return {
              ...prev,
              commitments: prev.commitments.map(c => c.id === id ? { ...c, status: status } : c)
          };
      });
      triggerCloudSync();
  }, [triggerCloudSync]);

  const toggleCommitment = useCallback((id) => {
      setContract(prev => {
          if (!prev) return null;
          return {
              ...prev,
              commitments: prev.commitments.map(c => {
                  if (c.id === id) {
                      return { ...c, status: c.status === 'completed' ? 'pending' : 'completed' };
                  }
                  return c;
              })
          };
      });
      triggerCloudSync();
  }, [triggerCloudSync]);

  const resetContract = useCallback(() => {
      if (contract) {
          archiveContract(contract, 'failed');
      }
      setContract(null); 
      triggerCloudSync();
  }, [contract, triggerCloudSync, archiveContract]);

  const completeContract = useCallback(() => {
      if (contract) {
          archiveContract(contract, 'completed');
      }
      setContract(null);
      triggerCloudSync();
  }, [contract, triggerCloudSync, archiveContract]);

  const saveRoutine = useCallback((title, commitments, allowedDays) => {
      setSavedRoutines(prev => [
          ...prev, 
          {
              id: `routine_${Date.now()}`,
              title,
              commitments,
              allowedDays
          }
      ]);
      triggerCloudSync();
  }, [triggerCloudSync]);

  const deleteRoutine = useCallback((id) => {
      setSavedRoutines(prev => prev.filter(r => r.id !== id));
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
            if (backup.contractHistory) setPastContracts(backup.contractHistory);
            if (backup.savedRoutines) setSavedRoutines(backup.savedRoutines);
             if (backup.settings) {
                setDailyNotificationEnabled(backup.settings.dailyNotificationEnabled);
                localStorage.setItem('chrono_daily_notif', String(backup.settings.dailyNotificationEnabled));
                if (backup.settings.briefingTime) {
                    setBriefingTime(backup.settings.briefingTime);
                    localStorage.setItem('chrono_briefing_time', backup.settings.briefingTime);
                }
                if (backup.settings.reviewTime) {
                    setReviewTime(backup.settings.reviewTime);
                    localStorage.setItem('chrono_review_time', backup.settings.reviewTime);
                }
            }
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
      cloudStatus, lastSyncTime, dailyNotificationEnabled, briefingTime, reviewTime, contract, pastContracts, savedRoutines,
      addTask, updateTask, deleteTask, startTask, stopTask, updateEntry, deleteEntry,
      deleteAllData: () => { if(window.confirm("¿BORRAR TODO?")) { localStorage.clear(); window.location.reload(); } },
      getTaskById: (id) => tasks.find(t => t.id === id),
      setGoal, deleteGoal,
      getGoalByTaskIdAndPeriod: (id, p) => goals.find(g => g.taskId === id && g.period === p),
      addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus,
      requestNotificationPermission: async () => { if(Notification.permission !== 'granted') await Notification.requestPermission(); },
      toggleDailyNotification, setNotificationTimes,
      exportData, importData, connectToCloud, triggerCloudSync,
      startContract, setCommitmentStatus, toggleCommitment, resetContract, completeContract, saveRoutine, deleteRoutine, setCloudConnected: (c) => setCloudStatus(c ? 'connected' : 'disconnected')
    }},
    children
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) throw new Error('useTimeTracker error');
  return context;
};
