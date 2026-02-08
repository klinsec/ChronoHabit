
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Task, TimeEntry, Goal, GoalPeriod, Subtask, SubtaskStatus, BackupData } from '../types';
import { findBackupFile, uploadBackupFile, initGoogleDrive, setGapiToken } from '../utils/googleDrive';

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
  exportData: () => string;
  importData: (jsonData: string, skipConfirm?: boolean) => boolean;
  triggerCloudSync: () => Promise<void>;
  setCloudConnected: (connected: boolean) => void;
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
  
  // Cloud Sync States
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('chrono_tasks');
      const storedEntries = localStorage.getItem('chrono_entries');
      const storedGoals = localStorage.getItem('chrono_goals');
      const storedSubtasks = localStorage.getItem('chrono_subtasks');
      const storedLastDate = localStorage.getItem('chrono_last_access_date');
      const storedLastSync = localStorage.getItem('chrono_last_sync');
      
      if (storedLastSync) setLastSyncTime(parseInt(storedLastSync));

      const todayString = new Date().toDateString();
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      else setTasks(defaultTasks);

      if (storedEntries) {
        const entries: TimeEntry[] = JSON.parse(storedEntries);
        setTimeEntries(entries);
        const currentActive = entries.find(e => e.endTime === null) || null;
        setActiveEntry(currentActive);
      }

      if(storedGoals) setGoals(JSON.parse(storedGoals));

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

  const exportData = useCallback(() => {
    const backup: BackupData = { tasks, timeEntries, goals, subtasks, timestamp: Date.now(), version: 1 };
    return JSON.stringify(backup);
  }, [tasks, timeEntries, goals, subtasks]);

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
            return true;
        }
        return false;
    } catch (e) {
        console.error("Import failed", e);
        if(!skipConfirm) alert("Error al importar el archivo.");
        return false;
    }
  }, []);

  return (
    <TimeTrackerContext.Provider value={{
      tasks, timeEntries, goals, subtasks, activeEntry, liveElapsedTime, lastAddedSubtaskId,
      cloudStatus, lastSyncTime,
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
      requestNotificationPermission: async () => { if(Notification.permission === 'granted') return; await Notification.requestPermission(); },
      exportData, importData, triggerCloudSync,
      setCloudConnected: (c) => setCloudStatus(c ? 'connected' : 'disconnected')
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
