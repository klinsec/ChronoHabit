
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uploadBackupFile, signInToGoogle, getUserInfo, initGoogleDrive, checkTokenAndRestore } from '../utils/googleDrive.js';
import { requestFcmToken, syncUserScore, subscribeToLeaderboard } from '../utils/firebaseConfig.js';

const TimeTrackerContext = createContext(undefined);

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};

// Helper to get ISO date string YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

const generateId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const FUN_ALIASES = [
    "Axolote", "Capibara", "Ornitorrinco", "Cactus", "Tostada", "Ninja", 
    "Samurái", "Vikingo", "Robot", "Fantasma", "Llama", "Yeti", "Kraken"
];

const generateFunName = () => FUN_ALIASES[Math.floor(Math.random() * FUN_ALIASES.length)];

const GOOGLE_CLIENT_ID = '347833746217-of5l8r31t5csaqtqce7130raeisgidlv.apps.googleusercontent.com';

const DEFAULT_TASKS = [
    { id: 't1', name: 'Trabajo', color: '#3b82f6', icon: '💼', difficulty: 5 },
    { id: 't2', name: 'Descanso', color: '#f97316', icon: '😴', difficulty: 1 },
    { id: 't3', name: 'Deporte', color: '#22c55e', icon: '💪', difficulty: 8 },
    { id: 't4', name: 'Estudio', color: '#eab308', icon: '📚', difficulty: 7 },
    { id: 't5', name: 'Ocio', color: '#8b5cf6', icon: '🎮', difficulty: 2 }
];

export const TimeTrackerProvider = ({ children }) => {
  // State definitions
  const [tasks, setTasks] = useState(() => {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });
  const [timeEntries, setTimeEntries] = useState(() => {
      const saved = localStorage.getItem('timeEntries');
      return saved ? JSON.parse(saved) : [];
  });
  const [activeEntry, setActiveEntry] = useState(null); 
  const [liveElapsedTime, setLiveElapsedTime] = useState(0);
  
  const [subtasks, setSubtasks] = useState(() => {
      const saved = localStorage.getItem('subtasks');
      return saved ? JSON.parse(saved) : [];
  });
  const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState(null);

  const [goals, setGoals] = useState(() => {
      const saved = localStorage.getItem('goals');
      return saved ? JSON.parse(saved) : [];
  });

  const [contract, setContract] = useState(() => {
      const saved = localStorage.getItem('contract');
      return saved ? JSON.parse(saved) : null;
  });
  const [pastContracts, setPastContracts] = useState(() => {
      const saved = localStorage.getItem('pastContracts');
      return saved ? JSON.parse(saved) : [];
  });
  const [savedRoutines, setSavedRoutines] = useState(() => {
      const saved = localStorage.getItem('savedRoutines');
      return saved ? JSON.parse(saved) : [];
  });

  // User Identity & Ranking
  const [userProfile, setUserProfile] = useState(() => {
      const saved = localStorage.getItem('userProfile');
      if (saved) {
          const parsed = JSON.parse(saved);
          if (!parsed.friends) parsed.friends = []; 
          return parsed;
      }
      return { id: generateId(), name: generateFunName(), friends: [] };
  });
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankingError, setRankingError] = useState(null);

  // Cloud & Settings
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Persistence Effects
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
  useEffect(() => localStorage.setItem('userProfile', JSON.stringify(userProfile)), [userProfile]);
  
  // Active Entry Restoration
  useEffect(() => {
    const active = timeEntries.find(e => e.endTime === null);
    if (active) setActiveEntry(active);
  }, [timeEntries]);

  // Timer Interval
  useEffect(() => {
    let interval = null;
    if (activeEntry) {
      setLiveElapsedTime(Date.now() - activeEntry.startTime);
      interval = setInterval(() => {
        setLiveElapsedTime(Date.now() - activeEntry.startTime);
      }, 1000);
    } else {
      setLiveElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Score Logic
  const calculateTotalScore = useCallback(() => {
      let total = 0;
      timeEntries.forEach(entry => {
          if (entry.endTime) {
              const task = tasks.find(t => t.id === entry.taskId);
              if (task && task.difficulty) {
                  const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
                  total += (hours * task.difficulty * 10);
              }
          }
      });
      subtasks.forEach(s => {
          if (s.completed && s.difficulty) total += s.difficulty;
      });
      const allHistory = [...pastContracts.flatMap(c => c.dailyHistory), ...(contract ? contract.dailyHistory : [])];
      allHistory.forEach(h => total += (h.points || 0));
      return Math.floor(total);
  }, [timeEntries, subtasks, pastContracts, contract, tasks]);

  // Sync Score
  useEffect(() => {
      const score = calculateTotalScore();
      syncUserScore(userProfile, score);
      const interval = setInterval(() => syncUserScore(userProfile, score), 60000);
      return () => clearInterval(interval);
  }, [userProfile, calculateTotalScore]);

  // Subscribe Leaderboard
  useEffect(() => {
      const unsubscribe = subscribeToLeaderboard(
          (data) => { setLeaderboard(data); setRankingError(null); },
          (error) => setRankingError(error.message)
      );
      return () => unsubscribe();
  }, []);

  const updateUsername = (name) => {
      if (name === userProfile.name) return;
      const newProfile = { ...userProfile, name };
      setUserProfile(newProfile);
      syncUserScore(newProfile, calculateTotalScore());
  };
  
  const addFriend = (friendId) => {
      if (friendId && friendId !== userProfile.id && !userProfile.friends.includes(friendId)) {
          setUserProfile(prev => ({ ...prev, friends: [...prev.friends, friendId] }));
      }
  };

  const removeFriend = (friendId) => {
      setUserProfile(prev => ({ ...prev, friends: prev.friends.filter(f => f !== friendId) }));
  };

  // Import/Export Logic
  const exportData = useCallback(() => {
      const data = {
          version: 1,
          timestamp: Date.now(),
          tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines,
          userProfile
      };
      return JSON.stringify(data, null, 2);
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, userProfile]);

  const importData = useCallback((json, merge = false) => {
      try {
          const data = JSON.parse(json);
          const update = (key, setter) => { if (data[key]) setter(data[key]); };
          update('tasks', setTasks);
          update('timeEntries', setTimeEntries);
          update('subtasks', setSubtasks);
          update('goals', setGoals);
          update('contract', setContract);
          update('pastContracts', setPastContracts);
          update('savedRoutines', setSavedRoutines);
          update('userProfile', setUserProfile);
          return true;
      } catch (e) {
          console.error("Import error", e);
          return false;
      }
  }, []);

  const connectToCloud = async () => {
      try {
          const tokenResponse = await signInToGoogle();
          setCloudStatus('connected');
      } catch (error) {
          setCloudStatus('error');
          throw error;
      }
  };

  const triggerCloudSync = useCallback(async () => {
      if (cloudStatus !== 'connected') return;
      setCloudStatus('syncing');
      try {
          await uploadBackupFile(exportData()); 
          setLastSyncTime(Date.now());
          setCloudStatus('connected');
      } catch (e) {
          setCloudStatus('error');
      }
  }, [cloudStatus, exportData]);

  // Basic CRUD wrappers
  const addTask = (task) => { setTasks(prev => [...prev, task]); triggerCloudSync(); };
  const updateTask = (task) => { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); triggerCloudSync(); };
  const deleteTask = (taskId) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSubtasks(prev => prev.filter(s => s.taskId !== taskId));
      setTimeEntries(prev => prev.filter(e => e.taskId !== taskId));
      triggerCloudSync();
  };
  const getTaskById = (taskId) => tasks.find(t => t.id === taskId);

  const startTask = (taskId) => {
    if (activeEntry) stopTask();
    const newEntry = { id: `entry_${Date.now()}`, taskId, startTime: Date.now(), endTime: null };
    setTimeEntries(prev => [...prev, newEntry]);
    setActiveEntry(newEntry);
    triggerCloudSync();
  };

  const stopTask = () => {
    if (activeEntry) {
      const updatedEntry = { ...activeEntry, endTime: Date.now() };
      setTimeEntries(prev => prev.map(e => e.id === activeEntry.id ? updatedEntry : e));
      setActiveEntry(null);
      triggerCloudSync();
    }
  };

  const updateEntry = (entry) => {
      setTimeEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      if (activeEntry && activeEntry.id === entry.id) setActiveEntry(entry.endTime ? null : entry);
      triggerCloudSync();
  };

  const deleteEntry = (entryId) => {
      setTimeEntries(prev => prev.filter(e => e.id !== entryId));
      if (activeEntry && activeEntry.id === entryId) setActiveEntry(null);
      triggerCloudSync();
  };

  const deleteAllData = () => {
      if (window.confirm("¿Borrar TODO?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const addSubtask = (subtaskData) => {
      const id = `sub_${Date.now()}`;
      const newSubtask = { ...subtaskData, id, createdAt: Date.now(), completed: false, status: 'idea' };
      if (newSubtask.deadline) {
          const today = new Date().setHours(0,0,0,0);
          if (newSubtask.deadline <= today + 86400000) newSubtask.status = 'today'; 
          else newSubtask.status = 'pending';
      }
      setSubtasks(prev => [...prev, newSubtask]);
      setLastAddedSubtaskId(id);
      setTimeout(() => setLastAddedSubtaskId(null), 2000);
      triggerCloudSync();
  };
  const updateSubtask = (s) => { setSubtasks(prev => prev.map(old => old.id === s.id ? s : old)); triggerCloudSync(); };
  const deleteSubtask = (id) => { setSubtasks(prev => prev.filter(s => s.id !== id)); triggerCloudSync(); };
  const toggleSubtaskCompletion = (id) => {
      setSubtasks(prev => prev.map(s => {
          if (s.id === id) return { ...s, completed: !s.completed, completedAt: !s.completed ? Date.now() : undefined, status: !s.completed ? 'log' : (s.status === 'log' ? 'today' : s.status) };
          return s;
      }));
      triggerCloudSync();
  };
  const moveSubtaskStatus = (id, status) => { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status } : s)); triggerCloudSync(); };
  const setGoal = (goal) => { setGoals(prev => { const others = prev.filter(g => !(g.taskId === goal.taskId && g.period === goal.period)); return [...others, goal]; }); triggerCloudSync(); };
  const deleteGoal = (taskId, period) => { setGoals(prev => prev.filter(g => !(g.taskId === taskId && g.period === period))); triggerCloudSync(); };
  const getGoalByTaskIdAndPeriod = (taskId, period) => goals.find(g => g.taskId === taskId && g.period === period);

  // Contract Logic
  const getContractWithTodayHistory = (c) => {
      const total = c.commitments.length;
      const completed = c.commitments.filter(com => com.status === 'completed').length;
      const ratio = total > 0 ? completed / total : 0;
      const points = parseFloat((c.currentStreakLevel * ratio).toFixed(1));
      const today = getTodayStr();
      const newHistory = [...c.dailyHistory];
      const todayIndex = newHistory.findIndex(h => h.date === today);
      const entry = { date: today, points, streakLevel: c.currentStreakLevel, totalCommitments: total, completedCommitments: completed };
      if (todayIndex >= 0) newHistory[todayIndex] = entry; else newHistory.push(entry);
      return { ...c, dailyHistory: newHistory, lastCheckDate: today };
  };
  const startContract = (commitments, duration = 1, allowedDays = [0,1,2,3,4,5,6]) => {
      setContract({ active: true, currentPhase: duration, dayInPhase: 0, startDate: Date.now(), lastCheckDate: getTodayStr(), commitments: commitments.map((c, i) => ({ ...c, id: `c_${i}_${Date.now()}`, status: 'pending' })), dailyHistory: [], currentStreakLevel: 1, failed: false, allowedDays, dailyCompleted: false });
      triggerCloudSync();
  };
  const setCommitmentStatus = (id, status) => { 
      setContract(prev => { 
          if (!prev) return null; 
          const updated = { ...prev, commitments: prev.commitments.map(com => com.id === id ? { ...com, status } : com) };
          return getContractWithTodayHistory(updated);
      }); 
      triggerCloudSync(); 
  };
  const completeDay = () => { if (contract) { setContract(prev => ({ ...getContractWithTodayHistory(prev), dailyCompleted: true })); triggerCloudSync(); } };
  const completeContract = () => { 
      if (contract) { 
          const final = getContractWithTodayHistory(contract); 
          const historyItem = { id: `hist_${Date.now()}`, startDate: final.startDate, endDate: Date.now(), phaseDuration: final.currentPhase, status: 'completed', commitmentsSnapshot: final.commitments.map(c => c.title), dailyHistory: final.dailyHistory };
          setPastContracts(prev => [historyItem, ...prev]);
          setContract(null); 
          triggerCloudSync(); 
      } 
  };
  const resetContract = () => { 
      if (contract) { 
          const final = getContractWithTodayHistory(contract); 
          const historyItem = { id: `hist_${Date.now()}`, startDate: final.startDate, endDate: Date.now(), phaseDuration: final.currentPhase, status: 'failed', commitmentsSnapshot: final.commitments.map(c => c.title), dailyHistory: final.dailyHistory };
          setPastContracts(prev => [historyItem, ...prev]);
      } 
      setContract(null); 
      triggerCloudSync(); 
  };
  useEffect(() => { 
      if (!contract) return; 
      const today = getTodayStr(); 
      if (contract.lastCheckDate !== today) { 
          const dayOfWeek = new Date().getDay(); 
          if (contract.allowedDays?.includes(dayOfWeek) ?? true) { 
              setContract(prev => prev ? ({ ...prev, dayInPhase: prev.dayInPhase + 1, lastCheckDate: today, dailyCompleted: false, commitments: prev.commitments.map(c => ({ ...c, status: 'pending' })) }) : null); 
          } else { 
              setContract(prev => prev ? ({ ...prev, lastCheckDate: today }) : null); 
          } 
      } 
  }, [contract]);
  
  const saveRoutine = (title, commitments, allowedDays) => { setSavedRoutines(prev => [...prev, { id: `routine_${Date.now()}`, title, commitments, allowedDays }]); triggerCloudSync(); };
  const deleteRoutine = (id) => { setSavedRoutines(prev => prev.filter(r => r.id !== id)); triggerCloudSync(); };

  // --- Notifications (Firebase Only) ---
  const requestNotificationPermission = async () => { 
      if (userProfile && userProfile.id) {
          const token = await requestFcmToken(userProfile.id);
          if (token) setNotificationsEnabled(true);
      } else {
          console.warn("User ID missing for notifications");
      }
  };
  
  const toggleDailyNotification = async () => { await requestNotificationPermission(); };

  return React.createElement(TimeTrackerContext.Provider, { value: {
      tasks, addTask, updateTask, deleteTask, getTaskById,
      timeEntries, activeEntry, startTask, stopTask, updateEntry, deleteEntry, liveElapsedTime, deleteAllData,
      subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus, lastAddedSubtaskId,
      goals, setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      contract, pastContracts, startContract, setCommitmentStatus, resetContract, completeContract, completeDay,
      savedRoutines, saveRoutine, deleteRoutine,
      cloudStatus, connectToCloud, triggerCloudSync, lastSyncTime, exportData, importData,
      notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
      userProfile, updateUsername, addFriend, removeFriend, leaderboard, calculateTotalScore, rankingError
    }},
    children
  );
};
