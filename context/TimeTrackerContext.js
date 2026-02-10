
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uploadBackupFile, signInToGoogle } from '../utils/googleDrive.js';
import { requestFcmToken, onMessageListener, syncUserScore, getLeaderboardData } from '../utils/firebaseConfig.js';

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

const generateId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const TimeTrackerProvider = ({ children }) => {
  // State definitions with lazy initialization
  const [tasks, setTasks] = useState(() => {
      const saved = localStorage.getItem('tasks');
      return saved ? JSON.parse(saved) : [];
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
      return saved ? JSON.parse(saved) : { id: generateId(), name: `ChronoUser`, friends: [] };
  });
  const [globalRankingId, setGlobalRankingId] = useState(() => {
      return localStorage.getItem('globalRankingId') || '';
  });
  const [leaderboard, setLeaderboard] = useState([]);

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
  
  // Save Ranking ID
  useEffect(() => {
      localStorage.setItem('globalRankingId', globalRankingId);
  }, [globalRankingId]);

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

  // --- Score Calculation & Sync ---
  const calculateTotalScore = useCallback(() => {
      let total = 0;
      // 1. Timer Points
      timeEntries.forEach(entry => {
          if (entry.endTime) {
              const task = tasks.find(t => t.id === entry.taskId);
              if (task && task.difficulty) {
                  const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
                  total += (hours * task.difficulty * 10);
              }
          }
      });
      // 2. Subtask Points
      subtasks.forEach(s => {
          if (s.completed && s.difficulty) total += s.difficulty;
      });
      // 3. Routine Points
      const allHistory = [...pastContracts.flatMap(c => c.dailyHistory), ...(contract ? contract.dailyHistory : [])];
      allHistory.forEach(h => total += (h.points || 0));
      
      return Math.floor(total);
  }, [timeEntries, subtasks, pastContracts, contract, tasks]);

  // Periodic Score Sync (Only if ID is set)
  useEffect(() => {
      if (!globalRankingId) return;
      
      const score = calculateTotalScore();
      const interval = setInterval(() => {
          syncUserScore(userProfile, score, globalRankingId);
      }, 60000); // Cada minuto
      
      // Initial Sync when ID changes or component mounts
      syncUserScore(userProfile, score, globalRankingId);

      return () => clearInterval(interval);
  }, [userProfile, calculateTotalScore, globalRankingId]);

  const refreshLeaderboard = useCallback(async () => {
      if (!globalRankingId) {
          setLeaderboard([]);
          return;
      }
      const data = await getLeaderboardData(globalRankingId);
      setLeaderboard(data);
  }, [globalRankingId]);

  const updateUsername = (name) => {
      setUserProfile(prev => ({ ...prev, name }));
      // Trigger sync immediately with new name
      const score = calculateTotalScore();
      if(globalRankingId) syncUserScore({ ...userProfile, name }, score, globalRankingId);
  };
  
  const setRankingId = (id) => {
      setGlobalRankingId(id);
  };

  const addFriend = (friendName) => {
      if (!userProfile.friends.includes(friendName)) {
          setUserProfile(prev => ({ ...prev, friends: [...prev.friends, friendName] }));
      }
  };

  const removeFriend = (friendName) => {
      setUserProfile(prev => ({ ...prev, friends: prev.friends.filter(f => f !== friendName) }));
  };

  // Cloud Export/Import (Backup logic)
  const exportData = useCallback(() => {
      const data = {
          version: 1,
          timestamp: Date.now(),
          tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines,
          settings: { notificationsEnabled, globalRankingId },
          userProfile
      };
      return JSON.stringify(data, null, 2);
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, notificationsEnabled, userProfile, globalRankingId]);

  const importData = useCallback((json, merge = false) => {
      try {
          const data = JSON.parse(json);
          const update = (key, setter) => {
              if (data[key]) setter(data[key]);
          };
          update('tasks', setTasks);
          update('timeEntries', setTimeEntries);
          update('subtasks', setSubtasks);
          update('goals', setGoals);
          update('contract', setContract);
          update('pastContracts', setPastContracts);
          update('savedRoutines', setSavedRoutines);
          update('userProfile', setUserProfile);
          if (data.settings && data.settings.globalRankingId) setGlobalRankingId(data.settings.globalRankingId);
          return true;
      } catch (e) {
          console.error("Import error", e);
          return false;
      }
  }, []);

  const connectToCloud = async () => {
      try {
          await signInToGoogle();
          setCloudStatus('connected');
      } catch (error) {
          console.error("Google Connect failed", error);
          setCloudStatus('error');
          throw error;
      }
  };

  const triggerCloudSync = useCallback(async () => {
      if (cloudStatus !== 'connected') return;
      setCloudStatus('syncing');
      try {
          const data = exportData();
          await uploadBackupFile(data); 
          setLastSyncTime(Date.now());
          setCloudStatus('connected');
      } catch (e) {
          console.error(e);
          setCloudStatus('error');
      }
  }, [cloudStatus, exportData]);

  // --- Task Methods Wrappers to trigger sync ---
  const addTask = (task) => { setTasks(prev => [...prev, task]); triggerCloudSync(); };
  const updateTask = (task) => { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); triggerCloudSync(); };
  const deleteTask = (taskId) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSubtasks(prev => prev.filter(s => s.taskId !== taskId));
      setTimeEntries(prev => prev.filter(e => e.taskId !== taskId));
      triggerCloudSync();
  };
  const getTaskById = (taskId) => tasks.find(t => t.id === taskId);

  // --- Time Entry Methods ---
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
      if (window.confirm("¿Estás seguro de que quieres borrar TODO? Esta acción no se puede deshacer.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  // --- Subtask & Goal Methods ---
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
  const updateSubtask = (subtask) => { setSubtasks(prev => prev.map(s => s.id === subtask.id ? subtask : s)); triggerCloudSync(); };
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

  // --- Discipline Wrappers ---
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
  const archiveContract = useCallback((finalContract, status) => {
      const historyItem = { id: `hist_${Date.now()}`, startDate: finalContract.startDate, endDate: Date.now(), phaseDuration: finalContract.currentPhase, status: status, commitmentsSnapshot: finalContract.commitments.map(c => c.title), dailyHistory: finalContract.dailyHistory };
      setPastContracts(prev => [historyItem, ...prev]);
  }, []);
  const startContract = (commitments, duration = 1, allowedDays = [0,1,2,3,4,5,6]) => {
      setContract({ active: true, currentPhase: duration, dayInPhase: 0, startDate: Date.now(), lastCheckDate: getTodayStr(), commitments: commitments.map((c, i) => ({ ...c, id: `c_${i}_${Date.now()}`, status: 'pending' })), history: [], dailyHistory: [], currentStreakLevel: 1, failed: false, allowedDays, dailyCompleted: false });
      triggerCloudSync();
  };
  const updateContractState = (updater) => { setContract(prev => { if (!prev) return null; return getContractWithTodayHistory(updater(prev)); }); triggerCloudSync(); };
  const toggleCommitment = (id) => { updateContractState(c => ({ ...c, commitments: c.commitments.map(com => com.id === id ? { ...com, status: com.status === 'completed' ? 'pending' : 'completed' } : com) })); };
  const setCommitmentStatus = (id, status) => { updateContractState(c => ({ ...c, commitments: c.commitments.map(com => com.id === id ? { ...com, status } : com) })); };
  const completeDay = () => { if (contract) { const updated = getContractWithTodayHistory(contract); setContract({ ...updated, dailyCompleted: true }); triggerCloudSync(); } };
  const completeContract = () => { if (contract) { const final = getContractWithTodayHistory(contract); archiveContract(final, 'completed'); setContract(null); triggerCloudSync(); } };
  const resetContract = useCallback(() => { if (contract) { let finalContract = getContractWithTodayHistory(contract); finalContract = { ...finalContract, dailyHistory: finalContract.dailyHistory.map(h => h.date === finalContract.lastCheckDate ? { ...h, points: 0 } : h) }; archiveContract(finalContract, 'failed'); } setContract(null); triggerCloudSync(); }, [contract, archiveContract, triggerCloudSync]);

  useEffect(() => { if (!contract) return; const today = getTodayStr(); if (contract.lastCheckDate !== today) { const dayOfWeek = new Date().getDay(); const isAllowedToday = contract.allowedDays?.includes(dayOfWeek) ?? true; if (isAllowedToday) { setContract(prev => { if(!prev) return null; return { ...prev, dayInPhase: prev.dayInPhase + 1, lastCheckDate: today, dailyCompleted: false, commitments: prev.commitments.map(c => ({ ...c, status: 'pending' })) } }); } else { setContract(prev => prev ? ({ ...prev, lastCheckDate: today }) : null); } } }, [contract]);
  const saveRoutine = (title, commitments, allowedDays = [0,1,2,3,4,5,6]) => { setSavedRoutines(prev => [...prev, { id: `routine_${Date.now()}`, title, commitments, allowedDays }]); triggerCloudSync(); };
  const deleteRoutine = (id) => { setSavedRoutines(prev => prev.filter(r => r.id !== id)); triggerCloudSync(); };

  // --- Notifications ---
  const requestNotificationPermission = async () => { await requestFcmToken(); };
  const toggleDailyNotification = async () => { await requestNotificationPermission(); };

  return React.createElement(TimeTrackerContext.Provider, { value: {
      tasks, addTask, updateTask, deleteTask, getTaskById,
      timeEntries, activeEntry, startTask, stopTask, updateEntry, deleteEntry, liveElapsedTime, deleteAllData,
      subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus, lastAddedSubtaskId,
      goals, setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      contract, pastContracts, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, completeDay,
      savedRoutines, saveRoutine, deleteRoutine,
      cloudStatus, connectToCloud, triggerCloudSync, lastSyncTime, exportData, importData,
      notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
      // Leaderboard Exports
      userProfile, updateUsername, addFriend, removeFriend, leaderboard, refreshLeaderboard, calculateTotalScore,
      globalRankingId, setRankingId
    }},
    children
  );
};
