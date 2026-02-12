
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    signInWithGoogle, logoutFirebase, subscribeToAuthChanges, 
    saveUserData, getUserData, requestFcmToken, 
    syncUserScore, subscribeToLeaderboard 
} from '../utils/firebaseConfig.js';

const TimeTrackerContext = createContext(undefined);

export const useTimeTracker = () => {
  const context = useContext(TimeTrackerContext);
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
};

// Helper for date string YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().split('T')[0];

export const TimeTrackerProvider = ({ children }) => {
    // --- State Definitions ---
    const [tasks, setTasks] = useState([]);
    const [timeEntries, setTimeEntries] = useState([]);
    const [activeEntry, setActiveEntry] = useState(null);
    const [subtasks, setSubtasks] = useState([]);
    const [goals, setGoals] = useState([]);
    const [contract, setContract] = useState(null);
    const [pastContracts, setPastContracts] = useState([]);
    const [savedRoutines, setSavedRoutines] = useState([]);
    
    // UI/System State
    const [liveElapsedTime, setLiveElapsedTime] = useState(0);
    const [lastAddedSubtaskId, setLastAddedSubtaskId] = useState(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    
    // Cloud/Firebase State
    const [cloudStatus, setCloudStatus] = useState('disconnected');
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [rankingError, setRankingError] = useState(null);
    const [localFriends, setLocalFriends] = useState([]);

    // --- Persistence (LocalStorage) ---
    useEffect(() => {
        const loadLocal = (key, setter, def) => {
            const stored = localStorage.getItem(key);
            if (stored) {
                try { setter(JSON.parse(stored)); } catch (e) { console.error(`Error loading ${key}`, e); }
            } else {
                setter(def);
            }
        };

        loadLocal('tasks', setTasks, []);
        loadLocal('timeEntries', setTimeEntries, []);
        loadLocal('activeEntry', setActiveEntry, null);
        loadLocal('subtasks', setSubtasks, []);
        loadLocal('goals', setGoals, []);
        loadLocal('contract', setContract, null);
        loadLocal('pastContracts', setPastContracts, []);
        loadLocal('savedRoutines', setSavedRoutines, []);
        loadLocal('notifications_enabled', setNotificationsEnabled, false);
        loadLocal('localFriends', setLocalFriends, []);
    }, []);

    useEffect(() => localStorage.setItem('tasks', JSON.stringify(tasks)), [tasks]);
    useEffect(() => localStorage.setItem('timeEntries', JSON.stringify(timeEntries)), [timeEntries]);
    useEffect(() => localStorage.setItem('activeEntry', JSON.stringify(activeEntry)), [activeEntry]);
    useEffect(() => localStorage.setItem('subtasks', JSON.stringify(subtasks)), [subtasks]);
    useEffect(() => localStorage.setItem('goals', JSON.stringify(goals)), [goals]);
    useEffect(() => { if(contract) localStorage.setItem('contract', JSON.stringify(contract)); else localStorage.removeItem('contract'); }, [contract]);
    useEffect(() => localStorage.setItem('pastContracts', JSON.stringify(pastContracts)), [pastContracts]);
    useEffect(() => localStorage.setItem('savedRoutines', JSON.stringify(savedRoutines)), [savedRoutines]);
    useEffect(() => localStorage.setItem('localFriends', JSON.stringify(localFriends)), [localFriends]);

    // --- Timer Logic ---
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

    // --- Import/Export ---
    const exportData = useCallback(() => {
        const data = {
            tasks, timeEntries, goals, subtasks, contract: contract || undefined,
            contractHistory: pastContracts, savedRoutines,
            settings: { dailyNotificationEnabled: notificationsEnabled },
            timestamp: Date.now(), version: 1
        };
        return JSON.stringify(data);
    }, [tasks, timeEntries, goals, subtasks, contract, pastContracts, savedRoutines, notificationsEnabled]);

    const importData = useCallback((json, merge) => {
        try {
            const data = JSON.parse(json);
            if (merge) {
                // Simple merge for lists, replacement for singletons if present
                if (data.tasks) setTasks(prev => [...prev, ...data.tasks.filter(t => !prev.find(p => p.id === t.id))]);
                if (data.timeEntries) setTimeEntries(prev => [...prev, ...data.timeEntries.filter(t => !prev.find(p => p.id === t.id))]);
                if (data.subtasks) setSubtasks(prev => [...prev, ...data.subtasks.filter(t => !prev.find(p => p.id === t.id))]);
                if (data.contractHistory) setPastContracts(prev => [...prev, ...data.contractHistory.filter(t => !prev.find(p => p.id === t.id))]);
            } else {
                if (data.tasks) setTasks(data.tasks);
                if (data.timeEntries) setTimeEntries(data.timeEntries);
                if (data.subtasks) setSubtasks(data.subtasks);
                if (data.goals) setGoals(data.goals);
                if (data.contract) setContract(data.contract);
                if (data.contractHistory) setPastContracts(data.contractHistory);
                if (data.savedRoutines) setSavedRoutines(data.savedRoutines);
            }
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }, []);

    // --- Auth Listener ---
    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((user) => {
            setFirebaseUser(user);
            if (user) {
                setCloudStatus('connected');
                // Auto-sync on login could go here
                getUserData(user.uid).then(val => {
                     // Optionally prompt user to overwrite local with cloud or vice versa
                });
            } else {
                setCloudStatus('disconnected');
            }
        });
        return () => unsubscribe();
    }, []);

    // --- CRUD Functions & Logic ---
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
        const newSubtask = { 
            ...subtaskData, 
            id, 
            createdAt: Date.now(), 
            completed: false, 
            status: 'idea',
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

    // Contract Logic helpers
    const getContractWithTodayHistory = (c) => {
        const total = c.commitments.length;
        const completed = c.commitments.filter(com => com.status === 'completed').length;
        const ratio = total > 0 ? completed / total : 0;
        
        const diaActual = c.currentStreakLevel;
        const points = parseFloat((diaActual * ratio).toFixed(2));

        const today = getTodayStr();
        const newHistory = [...c.dailyHistory];
        const todayIndex = newHistory.findIndex(h => h.date === today);
        const entry = { date: today, points, streakLevel: diaActual, totalCommitments: total, completedCommitments: completed };
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

    const toggleCommitment = (id) => {
         if(!contract) return;
         const com = contract.commitments.find(c => c.id === id);
         if(com) {
             setCommitmentStatus(id, com.status === 'completed' ? 'pending' : 'completed');
         }
    };
  
    const completeDay = () => { if (contract) { setContract(prev => prev ? ({ ...getContractWithTodayHistory(prev), dailyCompleted: true }) : null); } };
  
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
                    
                    const diaActual = prev.currentStreakLevel; 
                    const pointsEarned = parseFloat((diaActual * ratio).toFixed(2));
                    
                    let streakForTomorrow;
                    if (completed === total) {
                        streakForTomorrow = diaActual; 
                    } else {
                        streakForTomorrow = diaActual * ratio; 
                    }
                    
                    let nextLevel = Math.min(streakForTomorrow + 1, 10);
                    nextLevel = parseFloat(nextLevel.toFixed(2));
                    if (nextLevel < 1) nextLevel = 1;

                    const newHistory = [...prev.dailyHistory];
                    const histIdx = newHistory.findIndex(h => h.date === prev.lastCheckDate);
                    const historyEntry = { 
                        date: prev.lastCheckDate, 
                        points: pointsEarned, 
                        streakLevel: diaActual, 
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
  
    const saveRoutine = (title, commitments, allowedDays) => { 
        setSavedRoutines(prev => [...prev, { id: `routine_${Date.now()}`, title, commitments, allowedDays }]); 
    };
    const deleteRoutine = (id) => { setSavedRoutines(prev => prev.filter(r => r.id !== id)); };

    // --- Firebase Ranking & Social Logic (Merged) ---
    const handleAuthLogin = useCallback(async () => {
        setCloudStatus('syncing');
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Auth Error:", error);
            setCloudStatus('error');
            throw error; 
        }
    }, []);

    const handleLogoutRanking = async () => {
        await logoutFirebase();
    };
    const addFriend = (friendId) => setLocalFriends(prev => [...prev, friendId]);
    const removeFriend = (friendId) => setLocalFriends(prev => prev.filter(id => id !== friendId));
  
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
            contract, pastContracts, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, completeDay,
            savedRoutines, saveRoutine, deleteRoutine,
            cloudStatus, 
            connectToCloud: handleAuthLogin, 
            triggerCloudSync, lastSyncTime, exportData, importData,
            notificationsEnabled, requestNotificationPermission, toggleDailyNotification,
            firebaseUser, 
            handleLoginRanking: handleAuthLogin, 
            handleLogoutRanking, addFriend, removeFriend, leaderboard, calculateTotalScore, rankingError, localFriends
        }},
        children
    );
};
