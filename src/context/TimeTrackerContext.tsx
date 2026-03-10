
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { 
  Task, TimeEntry, Subtask, DisciplineContract, ContractHistoryItem, 
  SavedRoutine, Goal, View, GoalPeriod, Commitment, CommitmentStatus, SubtaskStatus,
  Reward
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
    getUserData,   // Cloud load
    onForegroundMessage,
    sendFriendRequest as fbSendFriendRequest,
    acceptFriendRequest as fbAcceptFriendRequest,
    rejectFriendRequest as fbRejectFriendRequest,
    subscribeToFriendRequests,
    subscribeToFriends,
    removeFriend as fbRemoveFriend
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
  advanceContract: (nextDuration: number) => void;
  toggleCommitment: (commitmentId: string) => void;
  setCommitmentStatus: (commitmentId: string, status: CommitmentStatus) => void;
  resetContract: () => void;
  completeContract: () => void;
  completeDay: () => void;
  
  savedRoutines: SavedRoutine[];
  saveRoutine: (title: string, commitments: Omit<Commitment, 'id' | 'status'>[], allowedDays?: number[]) => void;
  deleteRoutine: (id: string) => void;

  // REWARDS
  rewards: Reward[];
  addReward: (reward: Omit<Reward, 'id' | 'createdAt' | 'redeemed'>) => void;
  redeemReward: (id: string) => void;
  deleteReward: (id: string) => void;
  walletPoints: number; // Calculated live: Total Score - Spent Points

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
  
  // Social
  friendRequests: any[];
  sendFriendRequest: (toUserId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string, friendName: string, friendPhoto: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  friendsList: string[];

  leaderboard: any[];
  calculateTotalScore: () => number;
  calculateMonthlyScore: (monthKey: string) => number;
  rankingMonth: string;
  setRankingMonth: (month: string) => void;
  rankingError: string | null;
  localFriends: string[];
  
  // Dev Mode
  getNow: () => number;
  getTodayStr: () => string;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};

export const TimeTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State definitions
  const getNow = useCallback(() => Date.now(), []);
  
  const getTodayStr = useCallback(() => {
      return new Date(getNow()).toISOString().split('T')[0];
  }, [getNow]);

  const DEFAULT_TASKS: Task[] = [
    { id: 't_work', name: 'Trabajo', color: '#3b82f6', icon: '💼', satisfaction: 3 },
    { id: 't_project', name: 'Proyecto Personal', color: '#8b5cf6', icon: '🚀', satisfaction: 5 },
    { id: 't_sport', name: 'Deporte', color: '#10b981', icon: '💪', satisfaction: 5 },
    { id: 't_study', name: 'Estudio', color: '#f59e0b', icon: '📚', satisfaction: 5 },
    { id: 't_leisure', name: 'Ocio', color: '#ec4899', icon: '🎮', satisfaction: 10 },
    { id: 't_cleaning', name: 'Limpieza', color: '#6b7280', icon: '🧹', satisfaction: 5 }
  ];

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading tasks:", e);
    }
    return DEFAULT_TASKS;
  });

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('timeEntries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading timeEntries:", e);
      return [];
    }
  });

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  
  const [subtasks, setSubtasks] = useState<Subtask[]>(() => {
    try {
      const saved = localStorage.getItem('subtasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading subtasks:", e);
      return [];
    }
  });

  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState<string | null>(null);

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading goals:", e);
      return [];
    }
  });

  const [contract, setContract] = useState<DisciplineContract | null>(() => {
    try {
      const saved = localStorage.getItem('contract');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Error loading contract:", e);
      return null;
    }
  });

  const [pastContracts, setPastContracts] = useState<ContractHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('pastContracts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading pastContracts:", e);
      return [];
    }
  });

  const [savedRoutines, setSavedRoutines] = useState<SavedRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('savedRoutines');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading savedRoutines:", e);
      return [];
    }
  });

  const [rewards, setRewards] = useState<Reward[]>(() => {
    try {
      const saved = localStorage.getItem('rewards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading rewards:", e);
      return [];
    }
  });

  // User Identity & Ranking
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [rankingMonth, setRankingMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [localFriends, setLocalFriends] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('localFriends');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading localFriends:", e);
      return [];
    }
  });
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<string[]>([]);

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

  // Listen for Foreground Messages
  useEffect(() => {
      if (notificationsEnabled) {
          onForegroundMessage((payload) => {
              // Standard behavior: manually trigger a system notification if app is in foreground
              const title = payload.notification?.title || payload.data?.title || 'ChronoHabit';
              const body = payload.notification?.body || payload.data?.body || 'Nueva notificación';
              
              if (Notification.permission === 'granted') {
                  new Notification(title, {
                      body: body,
                      icon: './icon-192.png'
                  });
              } else {
                  console.warn("Received foreground message but permission not granted.");
              }
          });
      }
  }, [notificationsEnabled]);

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
  useEffect(() => localStorage.setItem('rewards', JSON.stringify(rewards)), [rewards]);
  useEffect(() => localStorage.setItem('localFriends', JSON.stringify(localFriends)), [localFriends]);

  // Cloud Persistence Effect (Firebase)
  // Replaces the old Google Drive logic
  useEffect(() => {
      if (firebaseUser) {
          // Debounce save to avoid hammering the DB
          const timer = setTimeout(() => {
              setCloudStatus('syncing');
              const dataToSave = JSON.stringify({
                  version: '1.5.15',
                  timestamp: getNow(),
                  tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, rewards, localFriends
              });
              
              // saveUserData uses 'set' which overwrites the 'backup' node for this user
              saveUserData(firebaseUser.uid, dataToSave)
                  .then(() => {
                      setLastSyncTime(getNow());
                      setCloudStatus('connected');
                  })
                  .catch(() => setCloudStatus('error'));
          }, 2000); // 2 second delay

          return () => clearTimeout(timer);
      }
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, rewards, localFriends, firebaseUser]);

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
        setLiveElapsedTime(getNow() - activeEntry.startTime);
      }, 10);
    } else {
      setLiveElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry, getNow]);

  // --- Task Methods ---
  const addTask = (task: Task) => setTasks([...tasks, task]);
  const updateTask = (task: Task) => setTasks(tasks.map(t => t.id === task.id ? task : t));
  const deleteTask = (taskId: string) => {
      setTasks(tasks.filter(t => t.id !== taskId));
      setSubtasks(subtasks.filter(s => s.taskId !== taskId));
      setTimeEntries(timeEntries.filter(e => e.taskId !== taskId));
  };
  const getTaskById = useCallback((taskId: string) => tasks.find(t => t.id === taskId), [tasks]);

  // --- Time Entry Methods ---
  const startTask = (taskId: string) => {
    if (activeEntry) stopTask();
    const newEntry: TimeEntry = {
      id: `entry_${Date.now()}`,
      taskId,
      startTime: getNow(),
      endTime: null
    };
    setTimeEntries([...timeEntries, newEntry]);
    setActiveEntry(newEntry);
  };

  const stopTask = () => {
    if (activeEntry) {
      const updatedEntry = { ...activeEntry, endTime: getNow() };
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
          setRewards([]);
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
          createdAt: getNow(),
          completed: false,
          status: 'idea'
      };
      if (newSubtask.deadline) {
          const today = new Date(getNow()).setHours(0,0,0,0);
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
                  completedAt: completed ? getNow() : undefined,
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
          id: `hist_${getNow()}`,
          startDate: finalContract.startDate,
          endDate: getNow(),
          phaseDuration: finalContract.currentPhase,
          status: status,
          commitmentsSnapshot: finalContract.commitments.map(c => c.title),
          dailyHistory: finalContract.dailyHistory || [],
          finalStreakLevel: finalContract.currentStreakLevel
      };
      setPastContracts(prev => [historyItem, ...prev]);
  }, [getNow]);

  const startContract = (commitments: Omit<Commitment, 'id' | 'status'>[], duration: number = 1, allowedDays: number[] = [0,1,2,3,4,5,6]) => {
      let initialStreak = 1;
      let alreadyCompletedToday = false;

      if (pastContracts.length > 0) {
          const last = pastContracts[0];
          const now = getNow();
          const todayStr = new Date(now).toDateString();
          const lastEndDateStr = last.endDate ? new Date(last.endDate).toDateString() : '';
          const wasToday = lastEndDateStr === todayStr;

          // Only inherit streak if the last contract was NOT failed
          if (last.status !== 'failed') {
              // Streak breaks if more than 1 day passes without starting a new contract
              const lastEndDate = last.endDate || 0;
              const todayStart = new Date(now).setHours(0,0,0,0);
              const lastEndDayStart = new Date(lastEndDate).setHours(0,0,0,0);
              const dayDiff = Math.floor((todayStart - lastEndDayStart) / (1000 * 60 * 60 * 24));

              if (dayDiff <= 1) {
                  if (last.finalStreakLevel) {
                      initialStreak = last.finalStreakLevel;
                  } else if (last.dailyHistory && last.dailyHistory.length > 0) {
                      const lastEntry = last.dailyHistory[last.dailyHistory.length - 1];
                      if (lastEntry && typeof lastEntry.streakLevel === 'number') {
                          initialStreak = lastEntry.streakLevel;
                      }
                  }
              } else {
                  initialStreak = 1; // Break streak if gap > 1 day
              }

              // If it was completed/finished today, we must wait until tomorrow for the new one
              if (wasToday && (last.status === 'completed' || last.status === 'finished')) {
                  alreadyCompletedToday = true;
              }
          }
      }

      const newContract: DisciplineContract = {
          active: true,
          currentPhase: duration,
          dayInPhase: alreadyCompletedToday ? 0 : 1,
          startDate: getNow(),
          lastCheckDate: getTodayStr(),
          commitments: commitments.map((c, i) => ({ ...c, id: `c_${i}_${getNow()}`, status: 'pending' })),
          history: [], 
          dailyHistory: [],
          currentStreakLevel: initialStreak,
          failed: false,
          allowedDays,
          dailyCompleted: alreadyCompletedToday
      };
      setContract(newContract);
  };

  const advanceContract = (nextDuration: number) => {
      if (!contract) return;
      
      const final = getContractWithTodayHistory(contract);
      
      // Calculate next level for the streak to be maintained/increased in the next contract
      const total = final.commitments.length;
      const completed = final.commitments.filter(c => c.status === 'completed').length;
      const ratio = total > 0 ? completed / total : 0;
      
      const nextBase = final.currentStreakLevel * ratio;
      let nextLevel = Math.min(nextBase + 1, 10);
      nextLevel = parseFloat(nextLevel.toFixed(2));
      if (nextLevel < 1) nextLevel = 1;

      // Archive current as completed
      archiveContract({ ...final, currentStreakLevel: nextLevel }, 'completed');

      // Start new contract immediately with the calculated streak level
      const newContract: DisciplineContract = {
          active: true,
          currentPhase: nextDuration,
          dayInPhase: 0, // Always 0 when refining because you just finished today
          startDate: getNow(),
          lastCheckDate: getTodayStr(),
          // Reuse commitments but reset status and IDs
          commitments: final.commitments.map((c, i) => ({ 
              ...c, 
              id: `c_${i}_${getNow()}`, 
              status: 'pending' 
          })),
          history: [], 
          dailyHistory: [],
          currentStreakLevel: nextLevel, // Pass the calculated level directly!
          failed: false,
          allowedDays: final.allowedDays || [0,1,2,3,4,5,6],
          dailyCompleted: true // Always true when refining because you just finished a phase today
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
         
         // Calculate next level for the streak to be maintained/increased in the next contract
         const total = final.commitments.length;
         const completed = final.commitments.filter(c => c.status === 'completed').length;
         const ratio = total > 0 ? completed / total : 0;
         
         const nextBase = final.currentStreakLevel * ratio;
         let nextLevel = Math.min(nextBase + 1, 10);
         nextLevel = parseFloat(nextLevel.toFixed(2));
         if (nextLevel < 1) nextLevel = 1;

         archiveContract({ ...final, currentStreakLevel: nextLevel }, 'completed');
         setContract(null);
      }
  };

  const resetContract = useCallback(() => {
      if (contract) {
          const today = getTodayStr();
          // Filter out today's entry to "restart the day" as requested by user
          // This ensures today's points from the broken contract are NOT counted
          const cleanHistory = contract.dailyHistory.filter(h => h.date !== today);
          const finalContract = { ...contract, dailyHistory: cleanHistory };
          
          archiveContract(finalContract, 'failed');
      }
      setContract(null);
  }, [contract, archiveContract, getTodayStr]);

  useEffect(() => {
      if (!contract) return;
      const today = getTodayStr();
      if (contract.lastCheckDate !== today) {
          const dayOfWeek = new Date(getNow()).getDay();
          const isAllowedToday = contract.allowedDays?.includes(dayOfWeek) ?? true;
          
          if (isAllowedToday) {
              setContract(prev => {
                  if(!prev) return null;
                  
                  // If we are moving from Day 0 to Day 1, we don't calculate progress
                  // because Day 0 was just a "waiting" day after completing a previous contract.
                  if (prev.dayInPhase === 0) {
                      return {
                          ...prev,
                          dayInPhase: 1,
                          lastCheckDate: today,
                          dailyCompleted: false,
                          commitments: prev.commitments.map(c => ({ ...c, status: 'pending' }))
                      };
                  }

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
  }, [contract, getTodayStr, getNow]);

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

  // --- REWARDS LOGIC ---
  const addReward = (rewardData: Omit<Reward, 'id' | 'createdAt' | 'redeemed'>) => {
      const newReward: Reward = {
          ...rewardData,
          id: `reward_${Date.now()}`,
          createdAt: getNow(),
          redeemed: false
      };
      setRewards(prev => [...prev, newReward]);
  };

  const redeemReward = (id: string) => {
      const reward = rewards.find(r => r.id === id);
      if(!reward || reward.redeemed) return;
      
      if (walletPoints >= reward.cost) {
          setRewards(prev => prev.map(r => r.id === id ? { ...r, redeemed: true, redeemedAt: getNow() } : r));
      } else {
          alert("No tienes suficientes puntos.");
      }
  };

  const deleteReward = (id: string) => {
      setRewards(prev => prev.filter(r => r.id !== id));
  };

  // --- Cloud & Export ---
  
  const exportData = () => {
      const data = {
          version: '1.5.15',
          timestamp: getNow(),
          tasks,
          timeEntries,
          subtasks,
          goals,
          contract,
          pastContracts,
          savedRoutines,
          rewards,
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
              if (data.rewards) setRewards(prev => mergeArrays(prev, data.rewards));
              if (data.localFriends) setLocalFriends(prev => Array.from(new Set([...prev, ...data.localFriends])));
          } else {
              if (data.tasks) setTasks(data.tasks);
              if (data.timeEntries) setTimeEntries(data.timeEntries);
              if (data.subtasks) setSubtasks(data.subtasks);
              if (data.goals) setGoals(data.goals);
              if (data.contract) setContract(data.contract);
              if (data.pastContracts) setPastContracts(data.pastContracts);
              if (data.savedRoutines) setSavedRoutines(data.savedRoutines);
              if (data.rewards) setRewards(data.rewards);
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
          setLastSyncTime(getNow());
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

  const sendFriendRequest = async (toUserId: string) => {
      if (!firebaseUser) return;
      await fbSendFriendRequest(
          firebaseUser.uid, 
          firebaseUser.displayName || 'Anónimo', 
          firebaseUser.photoURL || '', 
          toUserId
      );
  };

  const acceptFriendRequest = async (requestId: string, friendName: string, friendPhoto: string) => {
      if (!firebaseUser) return;
      await fbAcceptFriendRequest(
          firebaseUser.uid,
          firebaseUser.displayName || 'Anónimo',
          firebaseUser.photoURL || '',
          requestId,
          friendName,
          friendPhoto
      );
  };

  const rejectFriendRequest = async (requestId: string) => {
      if (!firebaseUser) return;
      await fbRejectFriendRequest(firebaseUser.uid, requestId);
  };

  const removeFriend = async (friendId: string) => {
      if (!firebaseUser) return;
      await fbRemoveFriend(firebaseUser.uid, friendId);
  };
  
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
          if (c.dailyHistory && Array.isArray(c.dailyHistory)) {
              c.dailyHistory.forEach(h => {
                  if (typeof h.points === 'number') total += h.points; 
              });
          }
      });
      return parseFloat(total.toFixed(2)); 
  }, [timeEntries, subtasks, pastContracts, contract]);

  const calculateMonthlyScore = useCallback((monthKey: string) => {
      let total = 0;
      const [year, month] = monthKey.split('-').map(Number);
      const startOfMonth = new Date(year, month - 1, 1).getTime();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();

      timeEntries.forEach(entry => {
          if (entry.endTime && entry.startTime >= startOfMonth && entry.startTime <= endOfMonth) {
              const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
              total += (hours * 0.5);
          }
      });
      subtasks.forEach(s => {
          if (s.completed && s.difficulty && s.completedAt && s.completedAt >= startOfMonth && s.completedAt <= endOfMonth) {
              total += s.difficulty;
          }
      });
      const contractsToCheck = [...pastContracts, ...(contract ? [contract] : [])];
      contractsToCheck.forEach(c => {
          if (c.dailyHistory && Array.isArray(c.dailyHistory)) {
              c.dailyHistory.forEach(h => {
                  const historyDate = new Date(h.date + 'T12:00:00').getTime();
                  if (historyDate >= startOfMonth && historyDate <= endOfMonth) {
                      if (typeof h.points === 'number') total += h.points;
                  }
              });
          }
      });
      return parseFloat(total.toFixed(2));
  }, [timeEntries, subtasks, pastContracts, contract]);

  const walletPoints = useMemo(() => {
      const totalEarned = calculateTotalScore();
      const totalSpent = rewards.filter(r => r.redeemed).reduce((acc, r) => acc + r.cost, 0);
      return parseFloat((totalEarned - totalSpent).toFixed(2));
  }, [calculateTotalScore, rewards]);

  useEffect(() => {
      if (firebaseUser) {
          const now = new Date(getNow());
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const score = calculateMonthlyScore(monthKey);
          syncUserScore(firebaseUser, score, monthKey);
          const interval = setInterval(() => {
              const currentScore = calculateMonthlyScore(monthKey);
              syncUserScore(firebaseUser, currentScore, monthKey);
          }, 60000);
          return () => clearInterval(interval);
      }
  }, [firebaseUser, calculateMonthlyScore, getNow]);

  // Subscribe to Leaderboard
  useEffect(() => {
      if (!firebaseUser || !rankingMonth) {
          setLeaderboard([]);
          setFriendRequests([]);
          setFriendsList([]);
          return;
      }
      const unsubLeaderboard = subscribeToLeaderboard(
          rankingMonth,
          (data) => { setLeaderboard(data); setRankingError(null); },
          (error) => setRankingError(error.message)
      );

      const unsubRequests = subscribeToFriendRequests(firebaseUser.uid, (requests) => {
          setFriendRequests(requests);
      });

      const unsubFriends = subscribeToFriends(firebaseUser.uid, (friends) => {
          setFriendsList(friends);
      });

      return () => {
          unsubLeaderboard();
          unsubRequests();
          unsubFriends();
      };
  }, [firebaseUser]);

  return (
    <TimeTrackerContext.Provider value={{
      tasks, addTask, updateTask, deleteTask, getTaskById,
      timeEntries, activeEntry, startTask, stopTask, updateEntry, deleteEntry, liveElapsedTime, deleteAllData,
      subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus, lastAddedSubtaskId,
      goals, setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      contract, pastContracts, startContract, advanceContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, completeDay,
      savedRoutines, saveRoutine, deleteRoutine,
      rewards, addReward, redeemReward, deleteReward, walletPoints,
      cloudStatus, connectToCloud, triggerCloudSync, lastSyncTime, exportData, importData,
      notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
      firebaseUser, handleLoginRanking, handleLogoutRanking, 
      friendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, friendsList,
      leaderboard, calculateTotalScore, calculateMonthlyScore, rankingMonth, setRankingMonth, rankingError, localFriends,
      getNow, getTodayStr
    }}>
      {children}
    </TimeTrackerContext.Provider>
  );
};
