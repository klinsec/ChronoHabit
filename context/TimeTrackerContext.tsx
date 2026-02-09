
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, TimeEntry, Goal, GoalPeriod, Subtask, SubtaskStatus, BackupData, DisciplineContract, ContractPhase, Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus, DailyRoutineHistory } from '../types';
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
  startContract: (commitments: Omit<Commitment, 'id' | 'status'>[], duration: number, allowedDays?: number[]) => void;
  setCommitmentStatus: (id: string, status: CommitmentStatus) => void;
  toggleCommitment: (id: string) => void; 
  resetContract: () => void;
  completeContract: () => void;
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

// Helper to calculate points and append to history before archiving
const getContractWithTodayHistory = (c: DisciplineContract): DisciplineContract => {
    const total = c.commitments.length;
    const completed = c.commitments.filter(comm => comm.status === 'completed').length;
    const potential = c.currentStreakLevel || 1;
    let earned = 0;
    
    // Rule: Points = floor(potential * ratio)
    if (total > 0) {
        earned = Math.floor(potential * (completed / total));
    }

    // Check if today is already in history to avoid duplicates
    const hasToday = c.dailyHistory.some(h => h.date === c.lastCheckDate);
    if (hasToday) return c;

    return {
        ...c,
        dailyHistory: [
            ...(c.dailyHistory || []),
            {
                date: c.lastCheckDate,
                points: earned,
                streakLevel: potential,
                totalCommitments: total,
                completedCommitments: completed
            }
        ]
    };
};

export const TimeTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState<string | null>(null);
  
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(true);
  const [briefingTime, setBriefingTime] = useState("09:00");
  const [reviewTime, setReviewTime] = useState("23:00");

  const [contract, setContract] = useState<DisciplineContract | null>(null);
  const [pastContracts, setPastContracts] = useState<ContractHistoryItem[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>([]);
  
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const archiveContract = useCallback((finishedContract: DisciplineContract, status: 'completed' | 'failed') => {
      setPastContracts(prev => {
          const newItem: ContractHistoryItem = {
              id: `hist_${Date.now()}`,
              startDate: finishedContract.startDate,
              endDate: Date.now(),
              phaseDuration: finishedContract.currentPhase,
              status: status,
              commitmentsSnapshot: finishedContract.commitments.map(c => c.title),
              dailyHistory: finishedContract.dailyHistory || []
          };
          return [newItem, ...prev].slice(0, 10); 
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
      const currentDayOfWeek = today.getDay(); 

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
          if (!parsedContract.dailyHistory) parsedContract.dailyHistory = [];
          if (!parsedContract.currentStreakLevel) parsedContract.currentStreakLevel = 1;

          // Contract Daily Reset Logic with Points
          if (parsedContract.active && parsedContract.lastCheckDate !== todayString) {
              const now = new Date();
              const hour = now.getHours();
              
              if (hour >= 1) { // 1 AM Grace Period
                  const lastDateStr = parsedContract.lastCheckDate;
                  const lastDate = new Date(lastDateStr);
                  
                  // Only calculate points if day > 0 (Day 0 is "waiting for tomorrow")
                  if (parsedContract.dayInPhase > 0) {
                      // 1. Calculate Points for Previous Day
                      const wasLastDateAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(lastDate.getDay());
                      
                      if (wasLastDateAllowed) {
                          const totalCommitments = parsedContract.commitments.length;
                          const completedCommitments = parsedContract.commitments.filter(c => c.status === 'completed').length;
                          
                          const potentialPoints = parsedContract.currentStreakLevel;
                          let earnedPoints = 0;
                          if (totalCommitments > 0) {
                              const ratio = completedCommitments / totalCommitments;
                              earnedPoints = Math.floor(potentialPoints * ratio);
                          }

                          // Save History
                          parsedContract.dailyHistory.push({
                              date: lastDateStr,
                              points: earnedPoints,
                              streakLevel: potentialPoints,
                              totalCommitments,
                              completedCommitments
                          });

                          // 2. Calculate Next Day's Streak Level
                          let nextStreak = earnedPoints + 1;
                          if (nextStreak > 10) nextStreak = 10;
                          if (nextStreak < 1) nextStreak = 1; 
                          
                          parsedContract.currentStreakLevel = nextStreak;
                      }
                  }

                  // 3. Setup Today
                  parsedContract.lastCheckDate = todayString;
                  const isTodayAllowed = !parsedContract.allowedDays || parsedContract.allowedDays.includes(currentDayOfWeek);

                  if (isTodayAllowed) {
                      parsedContract.dayInPhase += 1;
                      parsedContract.commitments = parsedContract.commitments.map(c => ({...c, status: 'pending'}));
                  }
                  
                  setContract(parsedContract);
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

  // Persistence Effects (omitted for brevity, assume same)
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

  // Exports & Sync (Unchanged)
  const exportData = useCallback(() => {
    const backup: BackupData = { 
        tasks, 
        timeEntries, 
        goals, 
        subtasks, 
        contract: contract || undefined,
        contractHistory: pastContracts,
        savedRoutines: savedRoutines,
        settings: { dailyNotificationEnabled, briefingTime, reviewTime },
        timestamp: Date.now(), 
        version: 1 
    };
    return JSON.stringify(backup);
  }, [tasks, timeEntries, goals, subtasks, contract, pastContracts, savedRoutines, dailyNotificationEnabled, briefingTime, reviewTime]);

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

  useEffect(() => {
    if (!dailyNotificationEnabled) return;
    const interval = setInterval(() => {
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
        const todayStr = now.toDateString();
        const hour = now.getHours();

        if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker.controller) return;

        if (currentTimeStr === briefingTime) {
             const lastNotifKey = `notif_briefing_${todayStr}`;
             if (!localStorage.getItem(lastNotifKey)) {
                 navigator.serviceWorker.controller?.postMessage({ type: 'SHOW_NOTIFICATION', title: `📅 Resumen`, options: { body: `Revisa tus objetivos de hoy.`, icon: './icon-192.png' } });
                 localStorage.setItem(lastNotifKey, 'true');
             }
        }
    }, 20000);
    return () => clearInterval(interval);
  }, [dailyNotificationEnabled, briefingTime, reviewTime]);

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
        navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title: 'ChronoHabit', options: { body: `Registrando tarea`, icon: './icon-192.png', tag: 'timer-notification', silent: true } });
    }
  }, [timeEntries, cloudStatus, triggerCloudSync]);

  const importData = useCallback((jsonData: string, skipConfirm = false): boolean => {
    try {
        const backup: BackupData = JSON.parse(jsonData);
        if (!Array.isArray(backup.tasks)) throw new Error("Format error");
        if (skipConfirm || window.confirm("¿Reemplazar datos?")) {
            setTasks(backup.tasks);
            setTimeEntries(backup.timeEntries);
            setGoals(backup.goals || []);
            setSubtasks(backup.subtasks || []);
            if (backup.contract) setContract(backup.contract);
            if (backup.contractHistory) setPastContracts(backup.contractHistory);
            if (backup.savedRoutines) setSavedRoutines(backup.savedRoutines);
            return true;
        }
        return false;
    } catch (e) { return false; }
  }, []);

  const startContract = useCallback((commitmentsData: Omit<Commitment, 'id' | 'status'>[], duration: number, allowedDays: number[] = [0,1,2,3,4,5,6]) => {
      let startDay = 1;
      const todayStr = new Date().toDateString();

      // Check if we are finishing an existing contract today
      if (contract) {
          // IMPORTANT: Calculate today's stats before archiving!
          const finalContract = getContractWithTodayHistory(contract);
          archiveContract(finalContract, 'completed');
          
          if (new Date(contract.lastCheckDate).toDateString() === todayStr) {
              startDay = 0;
          }
      } else {
          // Check history if starting from scratch
          const completedToday = pastContracts.some(c => 
              c.status === 'completed' && new Date(c.endDate).toDateString() === todayStr
          );
          if (completedToday) startDay = 0;
      }

      const newContract: DisciplineContract = {
          active: true,
          currentPhase: duration, 
          dayInPhase: startDay,
          startDate: Date.now(),
          lastCheckDate: new Date().toISOString().split('T')[0],
          failed: false,
          history: [],
          dailyHistory: [],
          currentStreakLevel: 1,
          allowedDays,
          commitments: commitmentsData.map((c, i) => ({ ...c, id: `comm_${Date.now()}_${i}`, status: 'pending' }))
      };
      setContract(newContract);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract, pastContracts]);

  const setCommitmentStatus = useCallback((id: string, status: CommitmentStatus) => {
      setContract(prev => prev ? { ...prev, commitments: prev.commitments.map(c => c.id === id ? { ...c, status: status } : c) } : null);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const toggleCommitment = useCallback((id: string) => {
      setContract(prev => prev ? { ...prev, commitments: prev.commitments.map(c => c.id === id ? { ...c, status: c.status === 'completed' ? 'pending' : 'completed' } : c) } : null);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const resetContract = useCallback(() => {
      if (contract) {
          // Even if failed, record progress made today
          const finalContract = getContractWithTodayHistory(contract);
          archiveContract(finalContract, 'failed');
      }
      setContract(null);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract]);

  const completeContract = useCallback(() => {
      if (contract) {
          // IMPORTANT: Calculate today's stats before archiving!
          const finalContract = getContractWithTodayHistory(contract);
          archiveContract(finalContract, 'completed');
      }
      setContract(null);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [contract, cloudStatus, triggerCloudSync, archiveContract]);

  const saveRoutine = useCallback((title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays?: number[]) => {
      setSavedRoutines(prev => [...prev, { id: `routine_${Date.now()}`, title, commitments, allowedDays }]);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const deleteRoutine = useCallback((id: string) => {
      setSavedRoutines(prev => prev.filter(r => r.id !== id));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);
  
  const setGoal = useCallback((goal: Goal) => {
      setGoals(prev => {
          const idx = prev.findIndex(g => g.taskId === goal.taskId && g.period === goal.period);
          if(idx > -1) { const n = [...prev]; n[idx] = goal; return n; }
          return [...prev, goal];
      });
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const deleteGoal = useCallback((taskId: string, period?: GoalPeriod) => {
      setGoals(prev => period ? prev.filter(g => !(g.taskId === taskId && g.period === period)) : prev.filter(g => g.taskId !== taskId));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const getGoalByTaskIdAndPeriod = useCallback((taskId: string, period: GoalPeriod) => {
      return goals.find(g => g.taskId === taskId && g.period === period);
  }, [goals]);

  const addSubtask = useCallback((subtask: Omit<Subtask, 'id' | 'completed' | 'createdAt' | 'status'>) => {
      const id = `subtask_${Date.now()}`;
      const newS: Subtask = { 
          ...subtask, 
          id, 
          completed: false, 
          createdAt: Date.now(), 
          status: subtask.deadline ? determineStatusFromDeadline(subtask.deadline, 'idea') : 'idea' 
      };
      setSubtasks(prev => [newS, ...prev]);
      setLastAddedSubtaskId(id);
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const updateSubtask = useCallback((s: Subtask) => {
      setSubtasks(prev => prev.map(x => x.id === s.id ? s : x));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const deleteSubtask = useCallback((id: string) => {
      setSubtasks(prev => prev.filter(s => s.id !== id));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const toggleSubtaskCompletion = useCallback((id: string) => {
      setSubtasks(prev => prev.map(s => {
          if (s.id === id) {
              const newCompleted = !s.completed;
              return { 
                  ...s, 
                  completed: newCompleted, 
                  completedAt: newCompleted ? Date.now() : undefined 
              };
          }
          return s;
      }));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  const moveSubtaskStatus = useCallback((id: string, status: SubtaskStatus) => {
      setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      if(cloudStatus==='connected') triggerCloudSync();
  }, [cloudStatus, triggerCloudSync]);

  return (
    <TimeTrackerContext.Provider value={{
      tasks, timeEntries, goals, subtasks, activeEntry, liveElapsedTime, lastAddedSubtaskId,
      cloudStatus, lastSyncTime, dailyNotificationEnabled, briefingTime, reviewTime, contract, pastContracts, savedRoutines,
      addTask: (t) => { setTasks(prev => [...prev, t]); if(cloudStatus==='connected') triggerCloudSync(); },
      updateTask: (t) => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteTask: (id) => { if(window.confirm("¿Borrar?")) { setTasks(prev => prev.filter(x => x.id !== id)); if(cloudStatus==='connected') triggerCloudSync(); } },
      startTask, stopTask,
      updateEntry: (e) => { setTimeEntries(prev => prev.map(x => x.id === e.id ? e : x)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteEntry: (id) => { setTimeEntries(prev => prev.filter(x => x.id !== id)); if(cloudStatus==='connected') triggerCloudSync(); },
      deleteAllData: () => { if(window.confirm("¿BORRAR TODO?")) { localStorage.clear(); window.location.reload(); } },
      getTaskById: (id) => tasks.find(t => t.id === id),
      setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus,
      requestNotificationPermission: async () => { if(Notification.permission !== 'granted') await Notification.requestPermission(); },
      toggleDailyNotification, setNotificationTimes, exportData, importData, triggerCloudSync,
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
