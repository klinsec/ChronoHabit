
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  Task, TimeEntry, Subtask, DisciplineContract, ContractHistoryItem, 
  SavedRoutine, Goal, View, GoalPeriod, Commitment, CommitmentStatus, SubtaskStatus
} from '../types';
// Import Firebase functions instead of Drive
import { 
    requestFcmToken, 
    syncUserScore, 
    subscribeToLeaderboard, 
    subscribeToAuthChanges, 
    signInWithGoogle, 
    logoutFirebase,
    saveUserData, // Cloud save (overwrite)
    getUserData   // Cloud load
} from '../utils/firebaseConfig';
import { User } from 'firebase/auth';

interface TimeTrackerContextType {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;

  timeEntries: TimeEntry[];
  activeEntry: TimeEntry | null;
  startTask: (taskId: string) => void;
  stopTask: () => void;
  updateEntry: (entry: TimeEntry) => void;
  deleteEntry: (entryId: string) => void;
  liveElapsedTime: number;
  deleteAllData: () => void;

  subtasks: Subtask[];
  addSubtask: (subtask: Omit<Subtask, 'id' | 'createdAt' | 'completed' | 'status'>) => void;
  updateSubtask: (subtask: Subtask) => void;
  deleteSubtask: (subtaskId: string) => void;
  toggleSubtaskCompletion: (subtaskId: string) => void;
  moveSubtaskStatus: (subtaskId: string, status: SubtaskStatus) => void;
  lastAddedSubtaskId: string | null;

  goals: Goal[];
  setGoal: (goal: Goal) => void;
  deleteGoal: (taskId: string, period: GoalPeriod) => void;
  getGoalByTaskIdAndPeriod: (taskId: string, period: GoalPeriod) => Goal | undefined;

  contract: DisciplineContract | null;
  pastContracts: ContractHistoryItem[];
  startContract: (commitments: Omit<Commitment, 'id' | 'status'>[], duration?: number, allowedDays?: number[]) => void;
  toggleCommitment: (commitmentId: string) => void;
  setCommitmentStatus: (commitmentId: string, status: CommitmentStatus) => void;
  resetContract: () => void;
  completeContract: () => void;
  completeDay: () => void;
  
  savedRoutines: SavedRoutine[];
  saveRoutine: (title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays?: number[]) => void;
  deleteRoutine: (id: string) => void;

  cloudStatus: 'disconnected' | 'connected' | 'syncing' | 'error';
  connectToCloud: () => Promise<void>;
  triggerCloudSync: () => Promise<void>;
  lastSyncTime: number | null;
  exportData: () => string;
  importData: (json: string, merge?: boolean) => boolean;

  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<void>;
  toggleDailyNotification: () => Promise<void>;

  firebaseUser: User | null;
  handleLoginRanking: () => Promise<void>;
  handleLogoutRanking: () => Promise<void>;
  addFriend: (friendId: string) => void;
  removeFriend: (friendId: string) => void;
  leaderboard: any[];
  calculateTotalScore: () => number;
  rankingError: string | null;
  localFriends: string[];
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};

// Helper to get ISO date string YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

export const TimeTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State definitions
  const [tasks, setTasks] = useState<Task[]>(() => {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : [];
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
      const saved = localStorage.getItem('timeEntries');
      return saved ? JSON.parse(saved) : [];
  });
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  
  const [subtasks, setSubtasks] = useState<Subtask[]>(() => {
      const saved = localStorage.getItem('subtasks');
      return saved ? JSON.parse(saved) : [];
  });
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState<string | null>(null);

  const [goals, setGoals] = useState<Goal[]>(() => {
      const saved = localStorage.getItem('goals');
      return saved ? JSON.parse(saved) : [];
  });

  const [contract, setContract] = useState<DisciplineContract | null>(() => {
      const saved = localStorage.getItem('contract');
      return saved ? JSON.parse(saved) : null;
  });
  const [pastContracts, setPastContracts] = useState<ContractHistoryItem[]>(() => {
      const saved = localStorage.getItem('pastContracts');
      return saved ? JSON.parse(saved) : [];
  });
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>(() => {
      const saved = localStorage.getItem('savedRoutines');
      return saved ? JSON.parse(saved) : [];
  });

  // User Identity & Ranking
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [localFriends, setLocalFriends] = useState<string[]>(() => {
      const saved = localStorage.getItem('localFriends');
      return saved ? JSON.parse(saved) : [];
  });

  // Cloud & Settings (Now powered by Firebase)
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'syncing' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
      if (typeof Notification !== 'undefined') {
          return Notification.permission === 'granted';
      }
      return false;
  });

  // Init Auth Listener
  useEffect(() => {
      const unsubscribe = subscribeToAuthChanges((user) => {
          setFirebaseUser(user);
          if (user) {
              setCloudStatus('connected');
              // Trigger fetch on login (Overwrite local with cloud or merge?)
              // Strategy: Merge for safety, but sync will eventually overwrite cloud.
              fetchCloudData(user.uid);
          } else {
              setCloudStatus('disconnected');
          }
      });
      return () => unsubscribe();
  }, []);

  // Persistence Effects (Local)
  useEffect(() => localStorage.setItem('tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('timeEntries', JSON.stringify(timeEntries)), [timeEntries]);
  useEffect(() => localStorage.setItem('subtasks', JSON.stringify(subtasks)), [subtasks]);
  useEffect(() => localStorage.setItem('goals', JSON.stringify(goals)), [goals]);
  useEffect(() => {
      if (contract) localStorage.setItem('contract', JSON.stringify(contract));
      else localStorage.removeItem('contract');
  }, [contract]);
  useEffect(() => localStorage.setItem('pastContracts', JSON.stringify(pastContracts)), [pastContracts]);
  useEffect(() => localStorage.setItem('savedRoutines', JSON.stringify(savedRoutines)), [savedRoutines]);
  useEffect(() => localStorage.setItem('localFriends', JSON.stringify(localFriends)), [localFriends]);

  // Cloud Persistence Effect (Firebase)
  // Replaces the old Google Drive logic
  useEffect(() => {
      if (firebaseUser) {
          // Debounce save to avoid hammering the DB
          const timer = setTimeout(() => {
              setCloudStatus('syncing');
              const dataToSave = JSON.stringify({
                  version: 1,
                  timestamp: Date.now(),
                  tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, localFriends
              });
              
              // saveUserData uses 'set' which overwrites the 'backup' node for this user
              saveUserData(firebaseUser.uid, dataToSave)
                  .then(() => {
                      setLastSyncTime(Date.now());
                      setCloudStatus('connected');
                  })
                  .catch(() => setCloudStatus('error'));
          }, 2000); // 2 second delay

          return () => clearTimeout(timer);
      }
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, localFriends, firebaseUser]);

  // Active Entry Restoration
  useEffect(() => {
    const active = timeEntries.find(e => e.endTime === null);
    if (active) setActiveEntry(active);
  }, [timeEntries]);

  // Timer Interval
  useEffect(() => {
    let interval: any;
    if (activeEntry) {
      interval = setInterval(() => {
        setLiveElapsedTime(Date.now() - activeEntry.startTime);
      }, 1000);
    } else {
      setLiveElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  // --- Task Methods ---
  const addTask = (task: Task) => setTasks([...tasks, task]);
  const updateTask = (task: Task) => setTasks(tasks.map(t => t.id === task.id ? task : t));
  const deleteTask = (taskId: string) => {
      setTasks(tasks.filter(t => t.id !== taskId));
      setSubtasks(subtasks.filter(s => s.taskId !== taskId));
      setTimeEntries(timeEntries.filter(e => e.taskId !== taskId));
  };
  const getTaskById = (taskId: string) => tasks.find(t => t.id === taskId);

  // --- Time Entry Methods ---
  const startTask = (taskId: string) => {
    if (activeEntry) stopTask();
    const newEntry: TimeEntry = {
      id: `entry_${Date.now()}`,
      taskId,
      startTime: Date.now(),
      endTime: null
    };
    setTimeEntries([...timeEntries, newEntry]);
    setActiveEntry(newEntry);
  };

  const stopTask = () => {
    if (activeEntry) {
      const updatedEntry = { ...activeEntry, endTime: Date.now() };
      setTimeEntries(timeEntries.map(e => e.id === activeEntry.id ? updatedEntry : e));
      setActiveEntry(null);
    }
  };

  const updateEntry = (entry: TimeEntry) => {
      setTimeEntries(timeEntries.map(e => e.id === entry.id ? entry : e));
      if (activeEntry && activeEntry.id === entry.id) {
          setActiveEntry(entry.endTime ? null : entry);
      }
  };

  const deleteEntry = (entryId: string) => {
      setTimeEntries(timeEntries.filter(e => e.id !== entryId));
      if (activeEntry && activeEntry.id === entryId) setActiveEntry(null);
  };

  const deleteAllData = () => {
      if (window.confirm("¿Estás seguro de que quieres borrar TODO? Esta acción no se puede deshacer.")) {
          setTasks([]);
          setTimeEntries([]);
          setActiveEntry(null);
          setSubtasks([]);
          setContract(null);
          setPastContracts([]);
          setSavedRoutines([]);
          setGoals([]);
          localStorage.clear();
      }
  };

  // --- Subtask Methods ---
  const addSubtask = (subtaskData: Omit<Subtask, 'id' | 'createdAt' | 'completed' | 'status'>) => {
      const id = `sub_${Date.now()}`;
      const newSubtask: Subtask = {
          ...subtaskData,
          id,
          createdAt: Date.now(),
          completed: false,
          status: 'idea'
      };
      if (newSubtask.deadline) {
          const today = new Date().setHours(0,0,0,0);
          if (newSubtask.deadline <= today + 86400000) newSubtask.status = 'today'; 
          else newSubtask.status = 'pending';
      }
      
      setSubtasks(prev => [...prev, newSubtask]);
      setLastAddedSubtaskId(id);
      setTimeout(() => setLastAddedSubtaskId(null), 2000);
  };

  const updateSubtask = (subtask: Subtask) => {
      setSubtasks(subtasks.map(s => s.id === subtask.id ? subtask : s));
  };

  const deleteSubtask = (id: string) => setSubtasks(subtasks.filter(s => s.id !== id));

  const toggleSubtaskCompletion = (id: string) => {
      setSubtasks(subtasks.map(s => {
          if (s.id === id) {
              const completed = !s.completed;
              return { 
                  ...s, 
                  completed, 
                  completedAt: completed ? Date.now() : undefined,
                  status: completed ? 'log' : (s.status === 'log' ? 'today' : s.status) 
              };
          }
          return s;
      }));
  };

  const moveSubtaskStatus = (id: string, status: SubtaskStatus) => {
      setSubtasks(subtasks.map(s => s.id === id ? { ...s, status } : s));
  };

  // --- Goal Methods ---
  const setGoal = (goal: Goal) => {
      setGoals(prev => {
          const others = prev.filter(g => !(g.taskId === goal.taskId && g.period === goal.period));
          return [...others, goal];
      });
  };

  const deleteGoal = (taskId: string, period: GoalPeriod) => {
      setGoals(prev => prev.filter(g => !(g.taskId === taskId && g.period === period)));
  };

  const getGoalByTaskIdAndPeriod = (taskId: string, period: GoalPeriod) => {
      return goals.find(g => g.taskId === taskId && g.period === period);
  };

  // --- Discipline Contract Logic ---
  const getContractWithTodayHistory = (c: DisciplineContract): DisciplineContract => {
      const total = c.commitments.length;
      const completed = c.commitments.filter(com => com.status === 'completed').length;
      const ratio = total > 0 ? completed / total : 0;
      
      // Points for today = Current Level * Ratio
      const points = parseFloat((c.currentStreakLevel * ratio).toFixed(2));

      const today = getTodayStr();
      const newHistory = [...c.dailyHistory];
      const todayIndex = newHistory.findIndex(h => h.date === today);

      const entry = {
          date: today,
          points,
          streakLevel: c.currentStreakLevel,
          totalCommitments: total,
          completedCommitments: completed
      };

      if (todayIndex >= 0) {
          newHistory[todayIndex] = entry;
      } else {
          newHistory.push(entry);
      }
      
      return { ...c, dailyHistory: newHistory, lastCheckDate: today };
  };

  const archiveContract = useCallback((finalContract: DisciplineContract, status: 'completed' | 'failed' | 'finished') => {
      const historyItem: ContractHistoryItem = {
          id: `hist_${Date.now()}`,
          startDate: finalContract.startDate,
          endDate: Date.now(),
          phaseDuration: finalContract.currentPhase,
          status: status,
          commitmentsSnapshot: finalContract.commitments.map(c => c.title),
          dailyHistory: finalContract.dailyHistory
      };
      setPastContracts(prev => [historyItem, ...prev]);
  }, []);

  const startContract = (commitments: Omit<Commitment, 'id' | 'status'>[], duration: number = 1, allowedDays: number[] = [0,1,2,3,4,5,6]) => {
      const newContract: DisciplineContract = {
          active: true,
          currentPhase: duration,
          dayInPhase: 0,
          startDate: Date.now(),
          lastCheckDate: getTodayStr(),
          commitments: commitments.map((c, i) => ({ ...c, id: `c_${i}_${Date.now()}`, status: 'pending' })),
          history: [], 
          dailyHistory: [],
          currentStreakLevel: 1,
          failed: false,
          allowedDays,
          dailyCompleted: false
      };
      setContract(newContract);
  };

  const updateContractState = (updater: (c: DisciplineContract) => DisciplineContract) => {
      if (contract) {
          const updated = updater(contract);
          const withHistory = getContractWithTodayHistory(updated);
          setContract(withHistory);
      }
  };

  const toggleCommitment = (id: string) => {
      updateContractState(c => ({
          ...c,
          commitments: c.commitments.map(com => com.id === id ? { 
              ...com, 
              status: com.status === 'completed' ? 'pending' : 'completed' 
          } : com)
      }));
  };

  const setCommitmentStatus = (id: string, status: CommitmentStatus) => {
      updateContractState(c => ({
          ...c,
          commitments: c.commitments.map(com => com.id === id ? { ...com, status } : com)
      }));
  };

  const completeDay = () => {
      if (contract) {
          const updated = getContractWithTodayHistory(contract);
          setContract({ ...updated, dailyCompleted: true });
      }
  };

  const completeContract = () => {
      if (contract) {
         const final = getContractWithTodayHistory(contract);
         archiveContract(final, 'completed');
         setContract(null);
      }
  };

  const resetContract = useCallback(() => {
      if (contract) {
          let finalContract = getContractWithTodayHistory(contract);
          // If manually resetting, today is considered a fail? Or just end it?
          // Usually means giving up.
          archiveContract(finalContract, 'failed');
      }
      setContract(null);
  }, [contract, archiveContract]);

  useEffect(() => {
      if (!contract) return;
      const today = getTodayStr();
      if (contract.lastCheckDate !== today) {
          const dayOfWeek = new Date().getDay();
          const isAllowedToday = contract.allowedDays?.includes(dayOfWeek) ?? true;
          
          if (isAllowedToday) {
              setContract(prev => {
                  if(!prev) return null;
                  
                  // Calculate Yesterday's Results
                  const total = prev.commitments.length;
                  const completed = prev.commitments.filter(c => c.status === 'completed').length;
                  const ratio = total > 0 ? completed / total : 0;
                  const currentLevel = prev.currentStreakLevel;
                  
                  const pointsEarned = parseFloat((currentLevel * ratio).toFixed(2));
                  
                  // LOGIC UPDATE:
                  // Base for tomorrow = CurrentLevel * Ratio
                  // Next Potential = Base + 1 (Capped at 10)
                  const nextBase = currentLevel * ratio;
                  let nextLevel = Math.min(nextBase + 1, 10);
                  // Ensure strict precision
                  nextLevel = parseFloat(nextLevel.toFixed(2));
                  if (nextLevel < 1) nextLevel = 1; // Sanity check

                  const newHistory = [...prev.dailyHistory];
                  const histIdx = newHistory.findIndex(h => h.date === prev.lastCheckDate);
                  const historyEntry = { 
                      date: prev.lastCheckDate, 
                      points: pointsEarned, 
                      streakLevel: currentLevel, 
                      totalCommitments: total, 
                      completedCommitments: completed 
                  };
                  
                  if (histIdx >= 0) {
                      newHistory[histIdx] = historyEntry;
                  } else {
                      newHistory.push(historyEntry);
                  }

                  return {
                      ...prev,
                      dayInPhase: prev.dayInPhase + 1, 
                      lastCheckDate: today,
                      dailyCompleted: false,
                      currentStreakLevel: nextLevel,
                      commitments: prev.commitments.map(c => ({ ...c, status: 'pending' })),
                      dailyHistory: newHistory
                  }
              });
          } else {
             setContract(prev => prev ? ({ ...prev, lastCheckDate: today }) : null);
          }
      }
  }, [contract]);

  // --- Saved Routines ---
  const saveRoutine = (title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays: number[] = [0,1,2,3,4,5,6]) => {
      const newRoutine: SavedRoutine = {
          id: `routine_${Date.now()}`,
          title,
          commitments,
          allowedDays
      };
      setSavedRoutines(prev => [...prev, newRoutine]);
  };

  const deleteRoutine = (id: string) => setSavedRoutines(prev => prev.filter(r => r.id !== id));

  // --- Cloud & Export ---
  
  const exportData = () => {
      const data = {
          version: 1,
          timestamp: Date.now(),
          tasks,
          timeEntries,
          subtasks,
          goals,
          contract,
          pastContracts,
          savedRoutines,
          localFriends
      };
      return JSON.stringify(data, null, 2);
  };

  const importData = (json: string, merge = false) => {
      try {
          const data = JSON.parse(json);
          // Helper to merge arrays preventing dupes by ID
          const mergeArrays = (prev: any[], newItems: any[]) => {
              if(!newItems) return prev;
              const ids = new Set(prev.map((i: any) => i.id));
              const fresh = newItems.filter((i: any) => !ids.has(i.id));
              return [...prev, ...fresh];
          };

          if (merge) {
              if (data.tasks) setTasks(prev => mergeArrays(prev, data.tasks));
              if (data.timeEntries) setTimeEntries(prev => mergeArrays(prev, data.timeEntries));
              if (data.subtasks) setSubtasks(prev => mergeArrays(prev, data.subtasks));
              if (data.goals) setGoals(prev => {
                  // Complex merge for goals (unique by task+period)
                  const map = new Map(prev.map(g => [`${g.taskId}_${g.period}`, g]));
                  data.goals?.forEach((g: Goal) => map.set(`${g.taskId}_${g.period}`, g));
                  return Array.from(map.values());
              });
              if (data.contract && !contract) setContract(data.contract);
              if (data.pastContracts) setPastContracts(prev => mergeArrays(prev, data.pastContracts));
              if (data.savedRoutines) setSavedRoutines(prev => mergeArrays(prev, data.savedRoutines));
              if (data.localFriends) setLocalFriends(prev => Array.from(new Set([...prev, ...data.localFriends])));
          } else {
              if (data.tasks) setTasks(data.tasks);
              if (data.timeEntries) setTimeEntries(data.timeEntries);
              if (data.subtasks) setSubtasks(data.subtasks);
              if (data.goals) setGoals(data.goals);
              if (data.contract) setContract(data.contract);
              if (data.pastContracts) setPastContracts(data.pastContracts);
              if (data.savedRoutines) setSavedRoutines(data.savedRoutines);
              if (data.localFriends) setLocalFriends(data.localFriends);
          }
          return true;
      } catch (e) {
          console.error("Import error", e);
          return false;
      }
  };

  const fetchCloudData = async (uid: string) => {
      setCloudStatus('syncing');
      try {
          const result = await getUserData(uid);
          if (result && result.data) {
              // We got data! Merge it in.
              importData(result.data, true); 
              setLastSyncTime(result.updatedAt);
          }
          setCloudStatus('connected');
      } catch (e) {
          setCloudStatus('error');
      }
  };

  const connectToCloud = async () => {
      try {
          await signInWithGoogle();
          // Auth listener in useEffect will handle the rest
      } catch (e) {
          console.error("Login failed", e);
          setCloudStatus('error');
      }
  };

  const triggerCloudSync = async () => {
      if (cloudStatus !== 'connected' || !firebaseUser) return;
      setCloudStatus('syncing');
      try {
          const data = exportData();
          await saveUserData(firebaseUser.uid, data);
          setLastSyncTime(Date.now());
          setCloudStatus('connected');
      } catch (e) {
          console.error(e);
          setCloudStatus('error');
      }
  };

  // --- Notifications ---
  const requestNotificationPermission = async () => {
      try {
          if ("Notification" in window) {
              const permission = await Notification.requestPermission();
              const granted = permission === 'granted';
              setNotificationsEnabled(granted);
              if(granted && firebaseUser) {
                  await requestFcmToken(firebaseUser.uid); 
              }
          }
      } catch (e) {
          console.error(e);
      }
  };

  const toggleDailyNotification = async () => {
      await requestNotificationPermission();
  };

  // --- Firebase Ranking & Social ---
  const handleLoginRanking = async () => {
      await signInWithGoogle();
  };
  const handleLogoutRanking = async () => {
      await logoutFirebase();
  };
  const addFriend = (friendId: string) => setLocalFriends(prev => [...prev, friendId]);
  const removeFriend = (friendId: string) => setLocalFriends(prev => prev.filter(id => id !== friendId));
  
  const calculateTotalScore = useCallback(() => {
      let total = 0;
      timeEntries.forEach(entry => {
          if (entry.endTime) {
              const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
              total += (hours * 0.5);
          }
      });
      subtasks.forEach(s => {
          if (s.completed && s.difficulty) total += s.difficulty;
      });
      const contractsToCheck = [...pastContracts, ...(contract ? [contract] : [])];
      contractsToCheck.forEach(c => {
          if (c.dailyHistory && c.dailyHistory.length > 0) {
              c.dailyHistory.forEach(h => {
                  if (h.points) total += h.points; 
              });
          }
      });
      return parseFloat(total.toFixed(2)); 
  }, [timeEntries, subtasks, pastContracts, contract]);

  useEffect(() => {
      if (firebaseUser) {
          const score = calculateTotalScore();
          syncUserScore(firebaseUser, score);
          const interval = setInterval(() => syncUserScore(firebaseUser, score), 60000);
          return () => clearInterval(interval);
      }
  }, [firebaseUser, calculateTotalScore]);

  // Subscribe to Leaderboard
  useEffect(() => {
      if (!firebaseUser) {
          setLeaderboard([]);
          return;
      }
      const unsubscribe = subscribeToLeaderboard(
          (data) => { setLeaderboard(data); setRankingError(null); },
          (error) => setRankingError(error.message)
      );
      return () => unsubscribe();
  }, [firebaseUser]);

  return (
    <TimeTrackerContext.Provider value={{
      tasks, addTask, updateTask, deleteTask, getTaskById,
      timeEntries, activeEntry, startTask, stopTask, updateEntry, deleteEntry, liveElapsedTime, deleteAllData,
      subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus, lastAddedSubtaskId,
      goals, setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      contract, pastContracts, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, completeDay,
      savedRoutines, saveRoutine, deleteRoutine,
      cloudStatus, connectToCloud, triggerCloudSync, lastSyncTime, exportData, importData,
      notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
      firebaseUser, handleLoginRanking, handleLogoutRanking, addFriend, removeFriend, leaderboard, calculateTotalScore, rankingError, localFriends
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};
