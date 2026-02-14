
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Drive imports removed, replaced by Firebase storage logic
import { 
    requestFcmToken, 
    syncUserScore, 
    subscribeToLeaderboard, 
    signInWithGoogle, 
    logoutFirebase, 
    subscribeToAuthChanges,
    saveUserData, // Function to overwrite data
    getUserData,   // Function to read data
    onForegroundMessage
} from '../utils/firebaseConfig.js';

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
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [rankingError, setRankingError] = useState(null);
  const [localFriends, setLocalFriends] = useState(() => {
      const saved = localStorage.getItem('localFriends');
      return saved ? JSON.parse(saved) : [];
  });

  // Cloud & Settings
  const [cloudStatus, setCloudStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
      const pref = localStorage.getItem('notifications_enabled');
      if (pref === 'true') return true;
      if (pref === 'false') return false;
      if (typeof Notification !== 'undefined') return Notification.permission === 'granted';
      return false;
  });

  // Import/Export Logic moved up for access
  const exportData = useCallback(() => {
      const data = {
          version: 1,
          timestamp: Date.now(),
          tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines,
          localFriends
      };
      return JSON.stringify(data, null, 2);
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, localFriends]);

  const importData = useCallback((json, merge = false) => {
      try {
          const data = JSON.parse(json);
          const update = (key, setter) => { 
              if (data[key]) {
                  if (merge && Array.isArray(data[key])) {
                      setter(prev => {
                          if (key === 'tasks' || key === 'subtasks' || key === 'timeEntries') {
                              // Avoid duplicates by ID
                              const existingIds = new Set(prev.map(i => i.id));
                              const newItems = data[key].filter(i => !existingIds.has(i.id));
                              return [...prev, ...newItems];
                          }
                          return data[key];
                      });
                  } else {
                      setter(data[key]); 
                  }
              }
          };
          
          if (merge) {
              update('tasks', setTasks);
              update('timeEntries', setTimeEntries);
              update('subtasks', setSubtasks);
              update('goals', setGoals);
              if(data.contract && !contract) update('contract', setContract);
              update('pastContracts', setPastContracts);
              update('savedRoutines', setSavedRoutines);
              update('localFriends', setLocalFriends);
          } else {
              update('tasks', setTasks);
              update('timeEntries', setTimeEntries);
              update('subtasks', setSubtasks);
              update('goals', setGoals);
              update('contract', setContract);
              update('pastContracts', setPastContracts);
              update('savedRoutines', setSavedRoutines);
              update('localFriends', setLocalFriends);
          }
          return true;
      } catch (e) {
          console.error("Import error", e);
          return false;
      }
  }, [contract]);

  // AUTO-INIT FIREBASE AUTH
  useEffect(() => {
      const unsubscribeAuth = subscribeToAuthChanges((user) => {
          setFirebaseUser(user);
          if (user) {
              setCloudStatus('connected');
              // Download remote data on login
              fetchCloudData(user.uid);
          } else {
              setCloudStatus('disconnected');
          }
      });
      return () => unsubscribeAuth();
  }, []);

  const fetchCloudData = async (uid) => {
      setCloudStatus('syncing');
      try {
          const result = await getUserData(uid);
          if (result && result.data) {
              // Parse and import. data is stored as string in saveUserData or object
              const dataStr = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
              importData(dataStr, true); // Merge on load
              setLastSyncTime(result.updatedAt);
          }
          setCloudStatus('connected');
      } catch (e) {
          setCloudStatus('error');
      }
  };

  // AUTO-SAVE TO FIREBASE ON CHANGE
  useEffect(() => {
      if (firebaseUser) {
          const timer = setTimeout(() => {
              setCloudStatus('syncing');
              // saveUserData uses 'set' which overwrites the backup node.
              saveUserData(firebaseUser.uid, exportData())
                  .then(() => {
                      setLastSyncTime(Date.now());
                      setCloudStatus('connected');
                  })
                  .catch(() => setCloudStatus('error'));
          }, 2000); // 2 seconds debounce
          return () => clearTimeout(timer);
      }
  }, [tasks, timeEntries, subtasks, goals, contract, pastContracts, savedRoutines, localFriends, firebaseUser, exportData]);

  // Listen for Foreground Messages
  useEffect(() => {
      if (notificationsEnabled) {
          onForegroundMessage((payload) => {
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

  // Persistence Effects (Local Storage)
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
      }, 30);
    } else {
      setLiveElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Score Logic
  const calculateTotalScore = useCallback(() => {
      let total = 0;
      
      // 1. Timer Points: 0.5 points per hour
      timeEntries.forEach(entry => {
          if (entry.endTime) {
              const hours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
              total += (hours * 0.5);
          }
      });

      // 2. Subtask Points
      subtasks.forEach(s => {
          if (s.completed && s.difficulty) total += s.difficulty;
      });

      // 3. Routine Points
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

  // Sync Score when Auth user is present
  useEffect(() => {
      if (firebaseUser) {
          const score = calculateTotalScore();
          syncUserScore(firebaseUser, score);
          const interval = setInterval(() => syncUserScore(firebaseUser, score), 60000);
          return () => clearInterval(interval);
      }
  }, [firebaseUser, calculateTotalScore]);

  // Subscribe Leaderboard
  useEffect(() => {
      if (!firebaseUser) {
          setLeaderboard([]);
          return;
      }

      const unsubscribe = subscribeToLeaderboard(
          (data) => { 
              setLeaderboard(data); 
              setRankingError(null); 
          },
          (error) => {
              console.error("Leaderboard error:", error);
              setRankingError(error.message);
          }
      );
      return () => unsubscribe();
  }, [firebaseUser]);

  const handleLoginRanking = async () => {
      try {
          await signInWithGoogle();
      } catch (e) {
          alert("Error al iniciar sesión: " + e.message);
      }
  };

  const handleLogoutRanking = async () => {
      await logoutFirebase();
  };
  
  const addFriend = (friendId) => {
      if (friendId && !localFriends.includes(friendId)) {
          setLocalFriends(prev => [...prev, friendId]);
      }
  };

  const removeFriend = (friendId) => {
      setLocalFriends(prev => prev.filter(f => f !== friendId));
  };

  const connectToCloud = async () => {
      try {
          await signInWithGoogle();
          return true;
      } catch (error) {
          setCloudStatus('error');
          throw error;
      }
  };

  const triggerCloudSync = useCallback(async () => {
      if (cloudStatus !== 'connected' || !firebaseUser) return;
      setCloudStatus('syncing');
      try {
          await saveUserData(firebaseUser.uid, exportData());
          setLastSyncTime(Date.now());
          setCloudStatus('connected');
      } catch (e) {
          setCloudStatus('error');
      }
  }, [cloudStatus, exportData, firebaseUser]);

  // Basic CRUD wrappers
  const addTask = (task) => { setTasks(prev => [...prev, task]); };
  const updateTask = (task) => { setTasks(prev => prev.map(t => t.id === task.id ? task : t)); };
  const deleteTask = (taskId) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSubtasks(prev => prev.filter(s => s.taskId !== taskId));
      setTimeEntries(prev => prev.filter(e => e.taskId !== taskId));
  };
  const getTaskById = (taskId) => tasks.find(t => t.id === taskId);

  const startTask = (taskId) => {
    if (activeEntry) stopTask();
    const newEntry = { id: `entry_${Date.now()}`, taskId, startTime: Date.now(), endTime: null };
    setTimeEntries(prev => [...prev, newEntry]);
    setActiveEntry(newEntry);
  };

  const stopTask = () => {
    if (activeEntry) {
      const updatedEntry = { ...activeEntry, endTime: Date.now() };
      setTimeEntries(prev => prev.map(e => e.id === activeEntry.id ? updatedEntry : e));
      setActiveEntry(null);
    }
  };

  const updateEntry = (entry) => {
      setTimeEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      if (activeEntry && activeEntry.id === entry.id) setActiveEntry(entry.endTime ? null : entry);
  };

  const deleteEntry = (entryId) => {
      setTimeEntries(prev => prev.filter(e => e.id !== entryId));
      if (activeEntry && activeEntry.id === entryId) setActiveEntry(null);
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
  };
  const updateSubtask = (s) => { setSubtasks(prev => prev.map(old => old.id === s.id ? s : old)); };
  const deleteSubtask = (id) => { setSubtasks(prev => prev.filter(s => s.id !== id)); };
  const toggleSubtaskCompletion = (id) => {
      setSubtasks(prev => prev.map(s => {
          if (s.id === id) return { ...s, completed: !s.completed, completedAt: !s.completed ? Date.now() : undefined, status: !s.completed ? 'log' : (s.status === 'log' ? 'today' : s.status) };
          return s;
      }));
  };
  const moveSubtaskStatus = (id, status) => { setSubtasks(prev => prev.map(s => s.id === id ? { ...s, status } : s)); };
  const setGoal = (goal) => { setGoals(prev => { const others = prev.filter(g => !(g.taskId === goal.taskId && g.period === goal.period)); return [...others, goal]; }); };
  const deleteGoal = (taskId, period) => { setGoals(prev => prev.filter(g => !(g.taskId === taskId && g.period === period))); };
  const getGoalByTaskIdAndPeriod = (taskId, period) => goals.find(g => g.taskId === taskId && g.period === period);

  // Contract Logic
  const getContractWithTodayHistory = (c) => {
      const total = c.commitments.length;
      const completed = c.commitments.filter(com => com.status === 'completed').length;
      const ratio = total > 0 ? completed / total : 0;
      
      const currentLevel = c.currentStreakLevel;
      // Points = CurrentLevel * Ratio. Use 2 decimals.
      const points = parseFloat((currentLevel * ratio).toFixed(2));

      const today = getTodayStr();
      const newHistory = [...c.dailyHistory];
      const todayIndex = newHistory.findIndex(h => h.date === today);
      const entry = { date: today, points, streakLevel: currentLevel, totalCommitments: total, completedCommitments: completed };
      if (todayIndex >= 0) newHistory[todayIndex] = entry; else newHistory.push(entry);
      return { ...c, dailyHistory: newHistory, lastCheckDate: today };
  };
  
  const startContract = (commitments, duration = 1, allowedDays = [0,1,2,3,4,5,6]) => {
      setContract({ active: true, currentPhase: duration, dayInPhase: 0, startDate: Date.now(), lastCheckDate: getTodayStr(), commitments: commitments.map((c, i) => ({ ...c, id: `c_${i}_${Date.now()}`, status: 'pending' })), dailyHistory: [], currentStreakLevel: 1, failed: false, allowedDays, dailyCompleted: false });
  };
  
  const setCommitmentStatus = (id, status) => { 
      setContract(prev => { 
          if (!prev) return null; 
          const updated = { ...prev, commitments: prev.commitments.map(com => com.id === id ? { ...com, status } : com) };
          return getContractWithTodayHistory(updated);
      }); 
  };
  
  const completeDay = () => { if (contract) { setContract(prev => ({ ...getContractWithTodayHistory(prev), dailyCompleted: true })); } };
  
  const completeContract = () => { 
      if (contract) { 
          const final = getContractWithTodayHistory(contract); 
          const historyItem = { id: `hist_${Date.now()}`, startDate: final.startDate, endDate: Date.now(), phaseDuration: final.currentPhase, status: 'completed', commitmentsSnapshot: final.commitments.map(c => c.title), dailyHistory: final.dailyHistory };
          setPastContracts(prev => [historyItem, ...prev]);
          setContract(null); 
      } 
  };
  
  const resetContract = () => { 
      if (contract) { 
          const final = getContractWithTodayHistory(contract); 
          const historyItem = { id: `hist_${Date.now()}`, startDate: final.startDate, endDate: Date.now(), phaseDuration: final.currentPhase, status: 'failed', commitmentsSnapshot: final.commitments.map(c => c.title), dailyHistory: final.dailyHistory };
          setPastContracts(prev => [historyItem, ...prev]);
      } 
      setContract(null); 
  };
  
  // Logic to handle Day Transitions and Streak Updates
  useEffect(() => { 
      if (!contract) return; 
      const today = getTodayStr(); 
      if (contract.lastCheckDate !== today) { 
          const dayOfWeek = new Date().getDay(); 
          if (contract.allowedDays?.includes(dayOfWeek) ?? true) { 
              setContract(prev => {
                  if (!prev) return null;
                  const total = prev.commitments.length;
                  const completed = prev.commitments.filter(c => c.status === 'completed').length;
                  const ratio = total > 0 ? completed / total : 0;
                  const currentLevel = prev.currentStreakLevel;
                  
                  const pointsEarned = parseFloat((currentLevel * ratio).toFixed(2));
                  
                  // NEW LOGIC: Base = Current * Ratio. Next = Base + 1 (capped at 10)
                  const nextBase = currentLevel * ratio;
                  let nextLevel = Math.min(nextBase + 1, 10);
                  nextLevel = parseFloat(nextLevel.toFixed(2));
                  if (nextLevel < 1) nextLevel = 1;

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
                  };
              }); 
          } else { 
              setContract(prev => prev ? ({ ...prev, lastCheckDate: today }) : null); 
          } 
      } 
  }, [contract]);
  
  const saveRoutine = (title, commitments, allowedDays) => { setSavedRoutines(prev => [...prev, { id: `routine_${Date.now()}`, title, commitments, allowedDays }]); };
  const deleteRoutine = (id) => { setSavedRoutines(prev => prev.filter(r => r.id !== id)); };

  // --- Notifications (Firebase Only) ---
  const requestNotificationPermission = async () => { 
      if (!firebaseUser) return false;
      try {
          const token = await requestFcmToken(firebaseUser.uid);
          if (token) {
              setNotificationsEnabled(true);
              localStorage.setItem('notifications_enabled', 'true');
              return true;
          } else {
              setNotificationsEnabled(false);
              localStorage.setItem('notifications_enabled', 'false');
              return false;
          }
      } catch (e) {
          setNotificationsEnabled(false);
          localStorage.setItem('notifications_enabled', 'false');
          return false;
      }
  };
  
  const toggleDailyNotification = async () => { 
      if (notificationsEnabled) {
          setNotificationsEnabled(false);
          localStorage.setItem('notifications_enabled', 'false');
      } else {
          const success = await requestNotificationPermission();
          if (success) alert("Notificaciones activadas correctamente.");
      }
  };

  return React.createElement(TimeTrackerContext.Provider, { value: {
      tasks, addTask, updateTask, deleteTask, getTaskById,
      timeEntries, activeEntry, startTask, stopTask, updateEntry, deleteEntry, liveElapsedTime, deleteAllData,
      subtasks, addSubtask, updateSubtask, deleteSubtask, toggleSubtaskCompletion, moveSubtaskStatus, lastAddedSubtaskId,
      goals, setGoal, deleteGoal, getGoalByTaskIdAndPeriod,
      contract, pastContracts, startContract, setCommitmentStatus, resetContract, completeContract, completeDay,
      savedRoutines, saveRoutine, deleteRoutine,
      cloudStatus, connectToCloud, triggerCloudSync, lastSyncTime, exportData, importData,
      notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
      firebaseUser, handleLoginRanking, handleLogoutRanking, addFriend, removeFriend, leaderboard, calculateTotalScore, rankingError, localFriends
    }},
    children
  );
};
