
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, TimeEntry, Goal, GoalPeriod, Subtask, SubtaskStatus, BackupData, DisciplineContract, ContractPhase, Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '../types';
import { findBackupFile, uploadBackupFile, initGoogleDrive } from '../utils/googleDrive';

interface TimeTrackerContextType {
  tasks: Task[];
  timeEntries: TimeEntry[];
  goals: Goal[];
  subtasks: Subtask[];
  activeEntry: TimeEntry | null;
  liveElapsedTime: number;
  lastAddedSubtaskId: string | null;
  cloudStatus: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastSyncTime: number | null;
  dailyNotificationEnabled: boolean;
  briefingTime: string;
  reviewTime: string;
  contract: DisciplineContract | null;
  pastContracts: ContractHistoryItem[];
  savedRoutines: SavedRoutine[];
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
  requestNotificationPermission: () => Promise<void>;
  toggleDailyNotification: () => void;
  setNotificationTimes: (briefing: string, review: string) => void;
  exportData: () => string;
  importData: (jsonData: string, skipConfirm?: boolean) => boolean;
  triggerCloudSync: () => Promise<void>;
  setCloudConnected: (connected: boolean) => void;
  // Contract Actions
  startContract: (commitments: Omit<Commitment, 'id' | 'status'>[], duration: number, allowedDays?: number[]) => void;
  setCommitmentStatus: (id: string, status: CommitmentStatus) => void;
  toggleCommitment: (id: string) => void; // Kept for backward compatibility/click toggle
  resetContract: () => void;
  completeContract: () => void;
  // Routine Actions
  saveRoutine: (title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays?: number[]) => void;
  deleteRoutine: (id: string) => void;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

const defaultTasks: Task[] = [
  { id: '1', name: 'Trabajo', color: '#ef4444', icon: '💼' },
  { id: '2', name: 'Ocio', color: '#eab308', icon: '🎮' },
  { id: '3', name: 'Ejercicio', color: '#22c55e', icon: '💪' },
  { id: '4', name: 'Proyecto personal', color: '#8b5cf6', icon: '🚀' },
  { id: '5', name: 'Limpieza', color: '#06b6d4', icon: '🧹' },
];

const determineStatusFromDeadline = (deadline: number | undefined, currentStatus: SubtaskStatus): SubtaskStatus => {
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

export const TimeTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState<string | null>(null);
  
  // Notification Config
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [briefingTime, setBriefingTime] = useState("09:00");
  const [reviewTime, setReviewTime] = useState("23:00");

  const [contract, setContract] = useState<DisciplineContract | null>(null);
  const [pastContracts, setPastContracts] = useState<ContractHistoryItem[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([]);
  
  // Cloud Sync States
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Helper to archive
  const archiveContract = useCallback((finishedContract: DisciplineContract, status: 'completed' | 'failed') => {
      setPastContracts(prev => {
          const newItem: ContractHistoryItem = {
              id: `hist_${Date.now()}`,
              startDate: finishedContract.startDate,
              endDate: Date.now(),
              phaseDuration: finishedContract.currentPhase,
              status: status,
              commitmentsSnapshot: finishedContract.commitments.map(c => c.title)
          };
          return [newItem, ...prev].slice(0, 6); // Keep last 6
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
      const storedDailyNotif = localStorage.getItem('chrono_daily_notif');
      const storedBriefing = localStorage.getItem('chrono_briefing_time');
      const storedReview = localStorage.getItem('chrono_review_time');
      
      if (storedLastSync) setLastSyncTime(parseInt(storedLastSync));
      if (storedDailyNotif !== null) setDailyNotificationEnabled(storedDailyNotif === 'true');
      if (storedBriefing) setBriefingTime(storedBriefing);
      if (storedReview) setReviewTime(storedReview);

      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const currentDayOfWeek = today.getDay(); // 0 = Sun

      if (storedTasks) setTasks(JSON.parse(storedTasks));
      else setTasks(defaultTasks);

      if (storedEntries) {
        const entries: TimeEntry[] = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) setGoals(JSON.parse(storedGoals));

      if (storedContract) {
          const parsedContract: DisciplineContract = JSON.parse(storedContract);
          
          // Data Migration
          parsedContract.commitments = parsedContract.commitments.map(c => {
              if ((c as any).completedToday !== undefined) {
                  return { 
                      ...c, 
                      status: (c as any).completedToday ? 'completed' : 'pending' 
                  } as Commitment;
              }
              return c;
          });

          // Contract Daily Reset Logic with Grace Period
          if (parsedContract.active && parsedContract.lastCheckDate !== todayString) {
              const now = new Date();
              const hour = now.getHours();
              
              // Only reset if it's past 1:00 AM. 
              if (hour >= 1) {
                  const lastDate = new Date(parsedContract.lastCheckDate);
                  // Check if the previous registered date was an allowed day
                  // If allowedDays is undefined, assume all days are allowed
                  const isLastDateAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(lastDate.getDay());
                  
                  let failed = false;
                  
                  // Logic: If the LAST date checked was an active day, we must have completed it.
                  if (isLastDateAllowed) {
                      const anyFailedOrPending = parsedContract.commitments.some(c => c.status !== 'completed');
                      if (anyFailedOrPending) {
                          failed = true;
                      }
                  }

                  if (failed) {
                      archiveContract(parsedContract, 'failed');
                      setContract(null); // Reset completely
                  } else {
                      // Success so far. Now setup for Today.
                      parsedContract.lastCheckDate = todayString;
                      
                      // Check if TODAY is an allowed day
                      const isTodayAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(currentDayOfWeek);

                      if (isTodayAllowed) {
                          // New active day: Increment phase and reset commitments
                          if (parsedContract.lastCheckDate) {
                              parsedContract.dayInPhase += 1;
                          }
                          parsedContract.commitments = parsedContract.commitments.map(c => ({...c, status: 'pending'}));
                      } else {
                          // Rest day: Do NOT increment phase, DO NOT reset commitments (or keep as is, UI handles display)
                          // We just update the date so we know we checked today.
                      }
                      setContract(parsedContract);
                  }
              } else {
                  // Inside grace period, keep as is
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
        let parsedSubtasks: Subtask[] = JSON.parse(storedSubtasks);
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

  // Persistence Effects
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

  // --- 1. Export Data ---
  const exportData = useCallback(() => {
    const backup: BackupData = { 
        tasks, 
        timeEntries, 
        goals, 
        subtasks, 
        contract: contract || undefined,
        contractHistory: pastContracts,
        savedRoutines: savedRoutines,
        settings: { 
            dailyNotificationEnabled,
            briefingTime,
            reviewTime
        },
        timestamp: Date.now(), 
        version: 1 
    };
    return JSON.stringify(backup);
  }, [tasks, timeEntries, goals, subtasks, contract, pastContracts, savedRoutines, dailyNotificationEnabled, briefingTime, reviewTime]);

  // --- 2. Trigger Sync ---
  const triggerCloudSync = useCallback(async () => {
    if (cloudStatus === 'disconnected' || cloudStatus === 'error') return;
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

  // --- 3. Toggle Notifications ---
  const toggleDailyNotification = useCallback(() => {
    setDailyNotificationEnabled(prev => {
        const newVal = !prev;
        localStorage.setItem('chrono_daily_notif', String(newVal));
        if(cloudStatus==='connected') triggerCloudSync();
        return newVal;
    });
  }, [cloudStatus, triggerCloudSync]); 

  const setNotificationTimes = useCallback((briefing: string, review: string) => {
      setBriefingTime(briefing);
      setReviewTime(review);
      localStorage.setItem('chrono_briefing_time', briefing);
      localStorage.setItem('chrono_review_time', review);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  // --- 4. Main Notification Interval Logic ---
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

        // Check if today is allowed for contract notifications
        const isContractDay = contract && contract.active && !contract.failed && (!contract.allowedDays || contract.allowedDays.includes(currentDayOfWeek));

        // 1. Contract Specific Time Notifications (Exact Time)
        if (isContractDay) {
            contract!.commitments.forEach(comm => {
                if (comm.time === currentTimeStr && comm.status === 'pending') {
                    const lastNotifKey = `notif_comm_${comm.id}_${todayStr}`;
                    if (!localStorage.getItem(lastNotifKey)) {
                         navigator.serviceWorker.controller?.postMessage({
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

        // 2. Daily Briefing (Configurable Time)
        if (currentTimeStr === briefingTime) {
            const lastNotifKey = `notif_briefing_${todayStr}`;
            if (!localStorage.getItem(lastNotifKey)) {
                const todayTasks = subtasks.filter(s => s.status === 'today' && !s.completed);
                if (todayTasks.length > 0) {
                     const items = todayTasks.slice(0, 3).map(t => `• ${t.title}`).join('\n');
                     const remaining = todayTasks.length - 3;
                     const body = items + (remaining > 0 ? `\n...y ${remaining} más.` : '');

                     navigator.serviceWorker.controller?.postMessage({
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

        // 3. End of Day Review (Configurable Time)
        if (currentTimeStr === reviewTime) {
            const lastNotifKey = `notif_review_${todayStr}`;
            if (!localStorage.getItem(lastNotifKey)) {
                if (isContractDay) {
                    const incompleteCount = contract!.commitments.filter(c => c.status !== 'completed').length;
                    if (incompleteCount > 0) {
                        navigator.serviceWorker.controller?.postMessage({
                            type: 'SHOW_NOTIFICATION',
                            title: '¿Completaste tu rutina?',
                            options: {
                                body: `Te faltan ${incompleteCount} compromisos por marcar hoy. ¡No rompas la cadena!`,
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
        
        // 4. Grace Period Warning (Midnight)
        if (hour === 0 && currentTimeStr === "00:00") {
             const lastNotifKey = `notif_grace_${todayStr}`;
             // Check if YESTERDAY was a contract day that needs completion
             const yesterday = new Date(now);
             yesterday.setDate(now.getDate() - 1);
             const yesterdayDay = yesterday.getDay();
             const wasContractDay = contract && contract.active && (!contract.allowedDays || contract.allowedDays.includes(yesterdayDay));

             if (wasContractDay && !localStorage.getItem(lastNotifKey)) {
                 const incompleteCount = contract!.commitments.filter(c => c.status !== 'completed').length;
                 if (incompleteCount > 0) {
                     navigator.serviceWorker.controller?.postMessage({
                        type: 'SHOW_NOTIFICATION',
                        title: '⚠️ ÚLTIMA OPORTUNIDAD',
                        options: {
                            body: `Tienes 1 hora para marcar tus rutinas de ayer o el contrato fallará.`,
                            icon: './icon-192.png',
                            tag: 'grace-period',
                            requireInteraction: true
                        }
                     });
                     localStorage.setItem(lastNotifKey, 'true');
                 }
             }
        }

    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [dailyNotificationEnabled, subtasks, contract, briefingTime, reviewTime]);

  // Elapsed time counter
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeEntry) {
      const updateElapsedTime = () => setLiveElapsedTime(Date.now() - activeEntry.startTime);
      updateElapsedTime();
      interval = setInterval(updateElapsedTime, 50);
    } else {
      setLiveElapsedTime(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [activeEntry]);

  const stopTask = useCallback(() => {
    if (activeEntry) {
      const now = Date.now();
      setTimeEntries(prev => prev.map(entry => entry.id === activeEntry.id ? { ...entry, endTime: now } : entry));
      setActiveEntry(null);
      if (cloudStatus === 'connected') triggerCloudSync();
      
      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_NOTIFICATION', tag: 'timer-notification' });
      }
    }
  }, [activeEntry, cloudStatus, triggerCloudSync]);

  const startTask = useCallback((taskId: string) => {
    const now = Date.now();
    let newEntries = [...timeEntries];
    const currentActiveIndex = newEntries.findIndex(e => e.endTime === null);
    if (currentActiveIndex > -1) newEntries[currentActiveIndex] = { ...newEntries[currentActiveIndex], endTime: now };
    const newEntry: TimeEntry = { id: `entry_${now}`, taskId, startTime: now, endTime: null };
    newEntries.push(newEntry);
    setTimeEntries(newEntries);
    setActiveEntry(newEntry);
    if (cloudStatus === 'connected') triggerCloudSync();

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
  }, [timeEntries, tasks, cloudStatus, triggerCloudSync]);

  const importData = useCallback((jsonData: string, skipConfirm = false): boolean => {
    try {
        const backup: BackupData = JSON.parse(jsonData);
        if (!Array.isArray(backup.tasks) || !Array.isArray(backup.timeEntries)) throw new Error("Format error");
        if (skipConfirm || window.confirm("¿Reemplazar datos actuales con el respaldo?")) {
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
        if(!skipConfirm) alert("Error al importar el archivo.");
        return false;
    }
  }, []);

  // --- Contract Functions ---

  const startContract = useCallback((commitmentsData: Omit<Commitment, 'id' | 'status'>[], duration: number, allowedDays: number[] = [0,1,2,3,4,5,6]) => {
      // If a contract exists and we are starting a new one, implies success of previous
      if (contract) {
          archiveContract(contract, 'completed');
      }

      const newContract: DisciplineContract = {
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
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract]);

  const setCommitmentStatus = useCallback((id: string, status: CommitmentStatus) => {
      setContract(prev => {
          if (!prev) return null;
          return {
              ...prev,
              commitments: prev.commitments.map(c => c.id === id ? { ...c, status: status } : c)
          };
      });
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const toggleCommitment = useCallback((id: string) => {
      setContract(prev => {
          if (!prev) return null;
          return {
              ...prev,
              commitments: prev.commitments.map(c => {
                  if (c.id === id) {
                      const newStatus: CommitmentStatus = c.status === 'completed' ? 'pending' : 'completed';
                      return { ...c, status: newStatus };
                  }
                  return c;
              })
          };
      });
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const resetContract = useCallback(() => {
      if (contract) {
          archiveContract(contract, 'failed');
      }
      setContract(null); // Full reset to menu
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract]);

  const completeContract = useCallback(() => {
      if (contract) {
          archiveContract(contract, 'completed');
      }
      setContract(null);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract]);

  // --- Routine Functions ---
  const saveRoutine = useCallback((title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays?: number[]) => {
      setSavedRoutines(prev => [
          ...prev, 
          {
              id: `routine_${Date.now()}`,
              title,
              commitments,
              allowedDays
          }
      ]);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const deleteRoutine = useCallback((id: string) => {
      setSavedRoutines(prev => prev.filter(r => r.id !== id));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);


  return (
    <TimeTrackerContext.Provider value={{
      tasks, timeEntries, goals, subtasks, activeEntry, liveElapsedTime, lastAddedSubtaskId,
      cloudStatus, lastSyncTime, dailyNotificationEnabled, briefingTime, reviewTime, contract, pastContracts, savedRoutines,
      addTask: (t) => { setTasks(prev => [...prev, t]); if(cloudStatus==='connected') triggerCloudSync(); },
      updateTask: (t) => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteTask: (id) => { if(window.confirm("¿Borrar tarea?")) { setTasks(prev => prev.filter(x => x.id !== id)); if(cloudStatus==='connected') triggerCloudSync(); } },
      startTask, stopTask,
      updateEntry: (e) => { setTimeEntries(prev => prev.map(x => x.id === e.id ? e : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteEntry: (id) => { setTimeEntries(prev => prev.filter(x => x.id !== id)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteAllData: () => { if(window.confirm("¿BORRAR TODO?")) { localStorage.clear(); window.location.reload(); } },
      getTaskById: (id) => tasks.find(t => t.id === id),
      setGoal: (g) => { setGoals(prev => { const idx = prev.findIndex(x => x.taskId === g.taskId && x.period === g.period); if(idx > -1) { const n = [...prev]; n[idx] = g; return n; } return [...prev, g]; }); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteGoal: (id, p) => { setGoals(prev => p ? prev.filter(x => !(x.taskId === id && x.period === p)) : prev.filter(x => x.taskId !== id)); if(cloudStatus==='connected') triggerCloudSync(); },
      getGoalByTaskIdAndPeriod: (id, p) => goals.find(g => g.taskId === id && g.period === p),
      addSubtask: (s) => { const id = `subtask_${Date.now()}`; setSubtasks(prev => [{ ...s, id, completed: false, createdAt: Date.now(), status: s.deadline ? determineStatusFromDeadline(s.deadline, 'idea') : 'idea' }, ...prev]); setLastAddedSubtaskId(id); if(cloudStatus==='connected') triggerCloudSync(); },
      updateSubtask: (s) => { setSubtasks(prev => prev.map(x => x.id === s.id ? s : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteSubtask: (id) => { setSubtasks(prev => prev.filter(x => x.id !== id)); if(cloudStatus==='connected') triggerCloudSync(); },
      toggleSubtaskCompletion: (id) => { setSubtasks(prev => prev.map(x => x.id === id ? { ...x, completed: !x.completed } : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      moveSubtaskStatus: (id, st) => { setSubtasks(prev => prev.map(x => x.id === id ? { ...x, status: st } : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      requestNotificationPermission: async () => { if(Notification.permission !== 'granted') await Notification.requestPermission(); },
      toggleDailyNotification,
      setNotificationTimes,
      exportData, importData, triggerCloudSync,
      setCloudConnected: (c) => setCloudStatus(c ? 'connected' : 'disconnected'),
      startContract, setCommitmentStatus, toggleCommitment, resetContract, completeContract, saveRoutine, deleteRoutine
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) throw new Error('useTimeTracker error');
  return context;
};
