
import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid } from 'recharts';
import { formatDuration } from '../../utils/helpers.js';
import { CogIcon, EditIcon, StarIcon, PlusIcon, TrashIcon, CopyIcon, UsersIcon } from '../Icons.js';
import GoalModal from '../modals/GoalModal.js';

const DateNavigator = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {
    
    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (period === 'day') newDate.setDate(newDate.getDate() - 1);
        if (period === 'week') newDate.setDate(newDate.getDate() - 7);
        if (period === 'month') newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (period === 'day') newDate.setDate(newDate.getDate() + 1);
        if (period === 'week') newDate.setDate(newDate.getDate() + 7);
        if (period === 'month') newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };
    
    const isNextDisabled = () => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const nextDate = new Date(currentDate);
        if (period === 'day') nextDate.setDate(nextDate.getDate() + 1);
        if (period === 'week') nextDate.setDate(nextDate.getDate() + 7);
        if (period === 'month') nextDate.setMonth(nextDate.getMonth() + 1);
        return nextDate > now;
    };
    
    if (period === 'all') return null;

    return (
        React.createElement('div', { className: "flex items-center justify-between mb-4 bg-surface p-2 rounded-xl" },
            React.createElement('button', { onClick: handlePrev, className: "p-2 rounded-lg hover:bg-gray-700 transition-colors" },
                React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }))
            ),
            React.createElement('div', { className: "flex flex-col items-center" },
                React.createElement('span', { className: "font-bold text-lg text-on-surface" }, dateRangeDisplay),
                React.createElement('button', { onClick: () => setCurrentDate(new Date()), className: "text-xs text-secondary hover:underline" }, "Hoy")
            ),
            React.createElement('button', { onClick: handleNext, disabled: isNextDisabled(), className: "p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" },
                React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" }))
            )
        )
    );
};

// --- LEADERBOARD COMPONENTS ---

const RankBadge = ({ rank }) => {
    let colorClass = "bg-gray-700 text-gray-300";
    
    // Numbers only, no medals, just colors
    if (rank === 1) { colorClass = "bg-yellow-500/20 text-yellow-500"; }
    else if (rank === 2) { colorClass = "bg-gray-400/20 text-gray-300"; }
    else if (rank === 3) { colorClass = "bg-orange-600/20 text-orange-500"; }

    return (
        React.createElement('div', { className: `w-8 h-8 rounded-full flex items-center justify-center font-bold ${colorClass} text-sm` },
            rank
        )
    );
};

const RankingTable = ({ data, localUser, title, icon, showFooterSelf = false, onRemoveItem, filterZero = false, limit }) => {
    // 1. Crear una copia de los datos remotos o usar array vacío
    let activeUsers = data ? [...data] : [];

    // 2. Inyectar al usuario local si no está en la lista (para que siempre te veas a ti mismo)
    if (localUser) {
        const exists = activeUsers.find(u => u.id === localUser.id);
        if (!exists) {
            activeUsers.push(localUser);
        } else {
            // Actualizar con datos locales más recientes si ya existe
            activeUsers = activeUsers.map(u => u.id === localUser.id ? { ...u, points: localUser.points, username: localUser.username } : u);
        }
    }

    // 3. Filtrar usuarios con 0 puntos si se solicita (excepto el usuario local si showFooterSelf es true, aunque el footer lo maneja aparte)
    // Actually, filterZero should filter everyone with 0. 
    // If showFooterSelf is true, we will re-check localUser separately for the footer if they get filtered out here.
    if (filterZero) {
        activeUsers = activeUsers.filter(u => u.points > 0 || (localUser && u.id === localUser.id));
    }

    // 4. Ordenar por puntos descendente
    activeUsers.sort((a, b) => b.points - a.points);
    
    // Find self index in the FULL sorted list
    const currentUserId = localUser?.id;
    const selfIndex = activeUsers.findIndex(u => u.id === currentUserId);
    const selfData = selfIndex >= 0 ? { ...activeUsers[selfIndex], rank: selfIndex + 1 } : null;
    
    // 5. Apply Limit (Mostrar solo los top N)
    const displayUsers = limit ? activeUsers.slice(0, limit) : activeUsers;
    
    // Check if self is in the visible list (index < limit)
    // Note: selfIndex is 0-based. Limit is count. e.g., Limit 10. Index 0-9 are visible.
    const isSelfInTop = selfIndex >= 0 && (limit ? selfIndex < limit : true);

    return (
        React.createElement('div', { className: "bg-surface rounded-2xl overflow-hidden border border-gray-800 shadow-lg mb-6" },
            React.createElement('div', { className: "p-4 border-b border-gray-800 bg-gray-900/50" },
                React.createElement('h3', { className: "text-lg font-bold text-white flex items-center gap-2" },
                    icon,
                    title
                )
            ),
            React.createElement('div', { className: "overflow-x-auto" },
                React.createElement('table', { className: "w-full text-sm text-left" },
                    React.createElement('thead', { className: "text-xs text-gray-500 uppercase bg-gray-900" },
                        React.createElement('tr', null,
                            React.createElement('th', { className: "px-4 py-3 w-16" }, "Pos"),
                            React.createElement('th', { className: "px-4 py-3" }, "Usuario"),
                            React.createElement('th', { className: "px-4 py-3 text-right" }, "Puntos"),
                            onRemoveItem && React.createElement('th', { className: "px-2 py-3 w-8" }, "")
                        )
                    ),
                    React.createElement('tbody', null,
                        displayUsers.length === 0 ? (
                            React.createElement('tr', null,
                                React.createElement('td', { colSpan: onRemoveItem ? 4 : 3, className: "px-4 py-6 text-center text-gray-500" }, 
                                    React.createElement('div', { className: "flex flex-col items-center gap-2" },
                                        React.createElement('span', null, "😴 Sin datos aún")
                                    )
                                )
                            )
                        ) : (
                            displayUsers.map((user, index) => (
                                React.createElement('tr', { 
                                    key: user.id || index, 
                                    className: `border-b border-gray-800 transition-colors ${user.id === currentUserId ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-800/50'}`
                                },
                                    React.createElement('td', { className: "px-4 py-3 font-medium" }, 
                                        React.createElement(RankBadge, { rank: index + 1 })
                                    ),
                                    React.createElement('td', { className: `px-4 py-3 ${user.id === currentUserId ? 'font-bold text-primary' : 'text-gray-300'}` }, 
                                        React.createElement('div', { className: "flex flex-col" },
                                            React.createElement('span', null, user.username || 'Anónimo'),
                                            user.id === currentUserId && React.createElement('span', { className: "text-[10px] text-gray-500" }, "(Tú)")
                                        )
                                    ),
                                    React.createElement('td', { className: "px-4 py-3 text-right font-mono font-bold text-white" }, 
                                        Math.floor(user.points || 0).toLocaleString()
                                    ),
                                    onRemoveItem && React.createElement('td', { className: "px-2 py-3 text-center" }, 
                                        user.id !== currentUserId && (
                                            React.createElement('button', { onClick: () => onRemoveItem(user.id), className: "text-gray-600 hover:text-red-500" },
                                                React.createElement(TrashIcon, null)
                                            )
                                        )
                                    )
                                )
                            ))
                        )
                    )
                )
            ),
            // Footer separator for cutoff
            limit && activeUsers.length > limit && (
                 React.createElement('div', { className: "px-4 py-2 bg-gray-900/30 text-center text-xs text-gray-500 font-mono tracking-widest" }, "...")
            ),
            // Self Row at bottom if not in visible list
            showFooterSelf && !isSelfInTop && selfData && (
                React.createElement('div', { className: "border-t border-gray-700 bg-gray-800 p-3 flex justify-between items-center animate-in slide-in-from-bottom-2" },
                    React.createElement('div', { className: "flex items-center gap-3" },
                        React.createElement('span', { className: "text-gray-400 text-xs uppercase" }, "Tu Posición:"),
                        React.createElement(RankBadge, { rank: selfData.rank })
                    ),
                    React.createElement('span', { className: "font-mono font-bold text-primary" }, Math.floor(selfData.points).toLocaleString())
                )
            )
        )
    );
};

const RankingView = () => {
    const { userProfile, updateUsername, leaderboard, calculateTotalScore, addFriend, removeFriend, rankingError } = useTimeTracker();
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(userProfile.name);
    const [friendInput, setFriendInput] = useState('');

    const handleSaveName = () => {
        if (newName.trim()) {
            updateUsername(newName.trim());
            setIsEditingName(false);
        }
    };

    const handleAddFriend = () => {
        if (friendInput.trim()) {
            addFriend(friendInput.trim());
            setFriendInput('');
        }
    };

    const copyUserId = () => {
        navigator.clipboard.writeText(userProfile.id).then(() => {
            alert("ID copiado al portapapeles: " + userProfile.id);
        });
    };

    const myScore = calculateTotalScore();
    const localUserObj = {
        id: userProfile.id,
        username: userProfile.name,
        points: myScore
    };

    // Filter logic: Friends are those in local friends list AND existing in leaderboard, OR self
    const friendsData = (leaderboard || []).filter(u => userProfile.friends.includes(u.id));
    const globalData = leaderboard || []; 

    return (
        React.createElement('div', { className: "space-y-6 animate-in fade-in duration-300" },
            
            /* Error Warning */
            rankingError && (
                React.createElement('div', { className: "bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg text-xs break-words" },
                    React.createElement('p', { className: "font-bold mb-1" }, "⚠️ Error de Conexión"),
                    React.createElement('p', { className: "font-mono bg-black/20 p-1 rounded mb-2" }, 
                        typeof rankingError === 'object' ? JSON.stringify(rankingError) : String(rankingError)
                    ),
                    React.createElement('p', null, "Posibles causas:"),
                    React.createElement('ul', { className: "list-disc pl-4 space-y-1 mt-1 text-[10px]" },
                        React.createElement('li', null, "Reglas de base de datos (comprueba que .read y .write sean true)"),
                        React.createElement('li', null, "API Key restringida en Google Cloud Console"),
                        React.createElement('li', null, "API 'Realtime Database' inhabilitada"),
                        React.createElement('li', null, "Conexión a internet inestable")
                    )
                )
            ),

            /* Profile Card */
            React.createElement('div', { className: "bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-2xl border border-gray-700" },
                React.createElement('div', { className: "flex justify-between items-start mb-2" },
                    React.createElement('div', null,
                        React.createElement('p', { className: "text-[10px] text-gray-400 uppercase tracking-widest mb-1" }, "TU PERFIL"),
                        isEditingName ? (
                            React.createElement('div', { className: "flex gap-2" },
                                React.createElement('input', { 
                                    type: "text", 
                                    value: newName, 
                                    onChange: (e) => setNewName(e.target.value),
                                    className: "bg-black/30 border border-gray-600 rounded px-2 py-1 text-white text-sm w-32"
                                }),
                                React.createElement('button', { onClick: handleSaveName, className: "bg-primary text-black px-2 rounded font-bold text-xs" }, "OK")
                            )
                        ) : (
                            React.createElement('h2', { className: "text-xl font-bold text-white flex items-center gap-2" },
                                userProfile.name,
                                React.createElement('button', { onClick: () => setIsEditingName(true), className: "text-gray-500 hover:text-white" }, React.createElement(EditIcon, null))
                            )
                        ),
                        React.createElement('div', { onClick: copyUserId, className: "flex items-center gap-1 text-xs text-gray-500 mt-2 cursor-pointer hover:text-primary transition-colors bg-black/20 w-fit px-2 py-1 rounded" },
                            React.createElement('span', null, `ID: ${userProfile.id}`),
                            React.createElement(CopyIcon, null)
                        )
                    ),
                    React.createElement('div', { className: "text-right" },
                        React.createElement('p', { className: "text-[10px] text-gray-400 uppercase tracking-widest mb-1" }, "PUNTUACIÓN"),
                        React.createElement('p', { className: "text-2xl font-mono font-bold text-primary" }, myScore.toLocaleString())
                    )
                )
            ),

            /* Friends Section - Muestra a todos, incluso con 0 puntos */
            React.createElement('div', null,
                React.createElement('div', { className: "flex gap-2 mb-3" },
                    React.createElement('input', {
                        type: "text",
                        value: friendInput,
                        onChange: (e) => setFriendInput(e.target.value),
                        placeholder: "Añadir amigo por ID...",
                        className: "flex-grow bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-500"
                    }),
                    React.createElement('button', { onClick: handleAddFriend, className: "bg-gray-700 hover:bg-primary hover:text-bkg text-white px-3 rounded-lg transition-colors" },
                        React.createElement(PlusIcon, null)
                    )
                ),
                React.createElement(RankingTable, { 
                    title: "Ranking de Amigos", 
                    icon: React.createElement(UsersIcon, null),
                    data: friendsData, 
                    localUser: localUserObj,
                    onRemoveItem: removeFriend,
                    filterZero: false // Amigos siempre visibles
                })
            ),

            /* Global Section - Oculta ceros excepto tú */
            React.createElement(RankingTable, { 
                title: "Ranking Global", 
                icon: React.createElement(StarIcon, null),
                data: globalData, 
                localUser: localUserObj,
                showFooterSelf: true,
                filterZero: true, // Ocultar extraños con 0 puntos
                limit: 10 // Mostrar solo los 10 primeros
            })
        )
    );
};

// --- MAIN STATS VIEW ---

const StatsView = () => {
  const { timeEntries, getTaskById, activeEntry, liveElapsedTime, getGoalByTaskIdAndPeriod, subtasks, contract, pastContracts } = useTimeTracker();
  const [activeTab, setActiveTab] = useState('charts'); // 'charts' | 'ranking'
  const [period, setPeriod] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  useEffect(() => {
    setCurrentDate(new Date());
  }, [period]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    let start;
    let end;
    let display;

    switch (period) {
      case 'day':
        start = new Date(targetDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(targetDate);
        end.setHours(23, 59, 59, 999);
        if (start.getTime() === today.getTime()) {
            display = 'Hoy';
        } else {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            if(start.getTime() === yesterday.getTime()) display = 'Ayer';
            else display = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        }
        break;
      case 'week':
        const dayOfWeek = targetDate.getDay();
        const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(targetDate.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        const todayWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
        todayWeekStart.setHours(0,0,0,0);
        if(start.getTime() === todayWeekStart.getTime()) display = "Esta Semana";
        else display = `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
        break;
      case 'month':
        start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        if(start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()) display = "Este Mes";
        else display = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        break;
      case 'all':
      default:
        start = new Date(targetDate.getFullYear(), 0, 1);
        end = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        display = `${targetDate.getFullYear()}`;
        break;
    }
    return { start: start.getTime(), end: end.getTime(), display };
  }, [period, currentDate]);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter(e => e.endTime && e.startTime >= dateRange.start && e.startTime <= dateRange.end);
  }, [timeEntries, dateRange]);

  const taskDurations = useMemo(() => {
    const durations = {};
    filteredEntries.forEach(entry => {
        if (entry.endTime) {
            const duration = entry.endTime - entry.startTime;
            durations[entry.taskId] = (durations[entry.taskId] || 0) + duration;
        }
    });

    const now = Date.now();
    if (activeEntry && now >= dateRange.start && now <= dateRange.end) {
      const startTimeInPeriod = Math.max(activeEntry.startTime, dateRange.start);
      const liveDurationInPeriod = now - startTimeInPeriod;
      durations[activeEntry.taskId] = (durations[activeEntry.taskId] || 0) + liveDurationInPeriod;
    }

    return durations;
  }, [filteredEntries, activeEntry, liveElapsedTime, dateRange]);

  const chartData = useMemo(() => {
    return Object.entries(taskDurations)
      .map(([taskId, duration]) => {
          const task = getTaskById(taskId);
          const goal = getGoalByTaskIdAndPeriod(taskId, period);
          return {
            name: task?.name || 'Unknown',
            value: duration,
            fill: task?.color || '#8884d8',
            icon: task?.icon || '❓',
            goal: goal
          };
      })
      .filter(item => Number(item.value) > 0 || (item.goal && item.goal.duration > 0))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [taskDurations, getTaskById, getGoalByTaskIdAndPeriod, period]);
  
  const totalDuration = useMemo(() => Object.values(taskDurations).reduce((sum, item) => sum + Number(item), 0), [taskDurations]);

  // --- UNIFIED POINTS LOGIC (For Charts) ---
  const unifiedPointsData = useMemo(() => {
      const bucketType = (period === 'week' || period === 'month') ? 'day' : 'month';
      const dataMap = new Map();
      
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      let cursor = new Date(startDate);
      while (cursor <= endDate) {
          let key = '';
          if (bucketType === 'day') {
              key = cursor.toISOString().split('T')[0];
              cursor.setDate(cursor.getDate() + 1);
          } else {
              key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
              cursor.setMonth(cursor.getMonth() + 1);
          }
          dataMap.set(key, { timer: 0, tasks: 0, routine: 0 });
      }

      // 1. Timer
      filteredEntries.forEach(entry => {
          if (!entry.endTime) return;
          const task = getTaskById(entry.taskId);
          if (!task || !task.difficulty) return;

          const entryDate = new Date(entry.startTime);
          let key = '';
          if (bucketType === 'day') key = entryDate.toISOString().split('T')[0];
          else key = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

          if (dataMap.has(key)) {
              const durationHours = (entry.endTime - entry.startTime) / (1000 * 60 * 60);
              const score = durationHours * task.difficulty * 10; // Normalized points
              const current = dataMap.get(key);
              current.timer += score;
          }
      });

      // 2. Tasks
      subtasks.forEach(subtask => {
          if (subtask.completed && subtask.completedAt) {
              if (subtask.completedAt >= dateRange.start && subtask.completedAt <= dateRange.end) {
                  const points = subtask.difficulty || 0;
                  const completedDate = new Date(subtask.completedAt);
                  let key = '';
                  if (bucketType === 'day') key = completedDate.toISOString().split('T')[0];
                  else key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;

                  if (dataMap.has(key)) {
                      const current = dataMap.get(key);
                      current.tasks += points;
                  }
              }
          }
      });

      // 3. Routine (History)
      const allDailyHistory = [
          ...(contract?.dailyHistory || []),
          ...pastContracts.flatMap(c => c.dailyHistory || [])
      ];

      allDailyHistory.forEach(dayHistory => {
          const historyDate = new Date(dayHistory.date);
          if (historyDate.getTime() >= dateRange.start && historyDate.getTime() <= dateRange.end) {
              let key = dayHistory.date;
              if (bucketType === 'month') {
                  key = `${historyDate.getFullYear()}-${String(historyDate.getMonth() + 1).padStart(2, '0')}`;
              }
              
              if (dataMap.has(key)) {
                  const current = dataMap.get(key);
                  current.routine += dayHistory.points;
              }
          }
      });

      // 4. Routine (TODAY - ACTIVE CONTRACT)
      if (contract && contract.active) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayDate = new Date();
          
          if (todayDate.getTime() >= dateRange.start && todayDate.getTime() <= dateRange.end) {
              let key = todayStr;
              if (bucketType === 'month') {
                  key = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`;
              }

              if (dataMap.has(key)) {
                  const potentialPoints = contract.currentStreakLevel || 1;
                  const totalCommitments = contract.commitments.length;
                  const completedCommitments = contract.commitments.filter(c => c.status === 'completed').length;
                  
                  let earnedPoints = 0;
                  if (totalCommitments > 0) {
                      const ratio = completedCommitments / totalCommitments;
                      earnedPoints = parseFloat((potentialPoints * ratio).toFixed(1));
                  }
                  
                  const current = dataMap.get(key);
                  current.routine += earnedPoints;
              }
          }
      }

      return Array.from(dataMap.entries()).map(([dateKey, values]) => {
          let label = '';
          const [year, month, day] = dateKey.split('-').map(Number);
          
          if (bucketType === 'day') {
              const dateObj = new Date(year, month - 1, day);
              label = dateObj.toLocaleDateString('es-ES', { weekday: 'narrow', day: 'numeric' });
          } else {
              const dateObj = new Date(year, month - 1, 1);
              label = dateObj.toLocaleDateString('es-ES', { month: 'short' });
          }

          return {
              date: label,
              ...values,
              total: values.timer + values.tasks + values.routine
          };
      });

  }, [filteredEntries, subtasks, contract, pastContracts, period, dateRange, getTaskById]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const { name, value, goal } = data;
      const percentage = totalDuration > 0 ? ((value / totalDuration) * 100).toFixed(1) : 0;
      return (
        React.createElement('div', { className: "bg-surface p-2 border border-gray-700 rounded-md shadow-lg text-sm" },
          React.createElement('p', { className: "font-bold text-base" }, name),
          React.createElement('p', null, `Progreso: ${formatDuration(value)}`),
          goal && React.createElement('p', null, `Objetivo: ${formatDuration(goal.duration)} (${goal.type === 'min' ? 'mínimo' : 'máximo'})`),
          totalDuration > 0 && React.createElement('p', null, `Porcentaje: ${percentage}%`)
        )
      );
    }
    return null;
  };

  const UnifiedTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
          const total = payload.reduce((sum, entry) => sum + entry.value, 0);
          return (
            React.createElement('div', { className: "bg-surface p-3 border border-gray-700 rounded-xl shadow-lg text-sm" },
                React.createElement('p', { className: "font-bold text-base text-white mb-2 border-b border-gray-700 pb-1" }, label),
                payload.map((entry) => (
                    React.createElement('div', { key: entry.name, className: "flex items-center gap-2 mb-1" },
                        React.createElement('div', { className: "w-2 h-2 rounded-full", style: { backgroundColor: entry.color } }),
                        React.createElement('span', { className: "text-gray-300 capitalize" }, `${entry.name}:`),
                        React.createElement('span', { className: "font-bold text-white" }, `${parseFloat(entry.value.toFixed(1))} pts`)
                    )
                )),
                React.createElement('div', { className: "mt-2 pt-2 border-t border-gray-700 flex justify-between" },
                    React.createElement('span', { className: "font-bold text-gray-400" }, "Total:"),
                    React.createElement('span', { className: "font-bold text-white text-lg" }, parseFloat(total.toFixed(1)))
                )
            )
          );
      }
      return null;
  };
  
  const renderProgressLabel = (props) => {
      const { x, y, width, value } = props;
      if (value === 0) return null;
      const formattedValue = formatDuration(value);
      return (
          React.createElement('text', { x: x + width + 5, y: y + 10, fill: "#e0e0e0", textAnchor: "start", dominantBaseline: "middle", className: "text-xs font-mono" },
              formattedValue
          )
      );
  };
  
  const renderGoalLabel = (props) => {
      const { x, y, width, goal } = props;
      if (!goal || goal.duration === 0) return null;
      const formattedValue = formatDuration(goal.duration);
      return (
           React.createElement('text', { x: x + width + 5, y: y + 18, fill: "#a0a0a0", textAnchor: "start", dominantBaseline: "middle", className: "text-xs font-mono" },
              formattedValue
          )
      );
  };

  const periodLabels = { day: 'Día', week: 'Semana', month: 'Mes', all: 'Año' };

  return (
    React.createElement('div', { className: "space-y-6" },
      isGoalModalOpen && React.createElement(GoalModal, { period: period, onClose: () => setIsGoalModalOpen(false) }),
      
      /* Tabs */
      React.createElement('div', { className: "flex bg-gray-800 p-1 rounded-xl mb-4" },
          React.createElement('button', 
              { 
                  onClick: () => setActiveTab('charts'),
                  className: `flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'charts' ? 'bg-surface text-primary shadow-md' : 'text-gray-400 hover:text-white'}`
              },
              "Gráficas"
          ),
          React.createElement('button', 
              { 
                  onClick: () => setActiveTab('ranking'),
                  className: `flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-surface text-yellow-500 shadow-md' : 'text-gray-400 hover:text-white'}`
              },
              "Ranking 🏆"
          )
      ),

      activeTab === 'ranking' ? (
          React.createElement(RankingView, null)
      ) : (
          React.createElement('div', null,
            React.createElement('div', { className: "flex justify-center bg-surface p-1 rounded-xl mb-4" },
                ['day', 'week', 'month', 'all'].map(p => (
                React.createElement('button', { key: p, onClick: () => setPeriod(p), className: `w-full py-2 text-sm font-semibold rounded-lg transition-colors ${period === p ? 'bg-primary text-bkg' : 'text-gray-300 hover:bg-gray-700'}` },
                    periodLabels[p]
                )
                ))
            ),
            
            React.createElement(DateNavigator, { period: period, currentDate: currentDate, setCurrentDate: setCurrentDate, dateRangeDisplay: dateRange.display }),

            chartData.length > 0 || unifiedPointsData.some(d => d.total > 0) ? (
                React.createElement('div', { className: "space-y-10" },
                    
                    /* Pie Chart */
                    React.createElement('div', null,
                        React.createElement('h3', { className: "text-xl font-semibold mb-2 text-center" }, "Distribución del Tiempo"),
                        React.createElement('div', { style: { width: '100%', height: 300 } },
                            React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                                React.createElement(PieChart, { margin: { top: 5, right: 20, left: 20, bottom: 5 } },
                                    React.createElement(Pie, 
                                        {
                                        data: chartData, 
                                        cx: "50%",
                                        cy: "50%",
                                        nameKey: "name",
                                        dataKey: "value",
                                        innerRadius: "60%",
                                        outerRadius: "80%",
                                        paddingAngle: 5,
                                        labelLine: false,
                                        isAnimationActive: !activeEntry
                                        },
                                        chartData.map((entry, index) => (React.createElement(Cell, { key: `cell-${index}`, fill: entry.fill, stroke: entry.fill })))
                                    ),
                                    React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
                                    React.createElement(Legend, null)
                                )
                            )
                        )
                    ),

                    /* Unified Stacked Bar Chart */
                    period !== 'day' && (
                        React.createElement('div', { className: "bg-surface/30 p-4 rounded-xl border border-gray-800" },
                            React.createElement('div', { className: "flex items-center justify-center gap-2 mb-4" },
                                React.createElement('h3', { className: "text-lg font-semibold text-center text-white" }, "Puntos Totales (Diario)")
                            ),
                            React.createElement('div', { style: { width: '100%', height: 300 } },
                                React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                                    React.createElement(BarChart, { data: unifiedPointsData, margin: { top: 10, right: 10, left: -20, bottom: 0 } },
                                        React.createElement(CartesianGrid, { strokeDasharray: "3 3", vertical: false, stroke: "#333" }),
                                        React.createElement(XAxis, { 
                                            dataKey: "date", 
                                            tick: { fill: '#888', fontSize: 10 }, 
                                            axisLine: false, 
                                            tickLine: false,
                                            interval: period === 'month' ? 2 : 0
                                        }),
                                        React.createElement(YAxis, { tick: { fill: '#888', fontSize: 10 }, axisLine: false, tickLine: false }),
                                        React.createElement(Tooltip, { content: React.createElement(UnifiedTooltip, null), cursor: { fill: 'rgba(255, 255, 255, 0.1)' } }),
                                        React.createElement(Legend, { iconType: "circle", wrapperStyle: { paddingTop: '10px' } }),
                                        React.createElement(Bar, { dataKey: "timer", name: "Cronómetro", stackId: "a", fill: "#bb86fc", radius: [0,0,4,4], barSize: 20 }),
                                        React.createElement(Bar, { dataKey: "tasks", name: "Tareas", stackId: "a", fill: "#eab308", barSize: 20 }),
                                        React.createElement(Bar, { dataKey: "routine", name: "Rutina", stackId: "a", fill: "#3b82f6", radius: [4,4,0,0], barSize: 20 })
                                    )
                                )
                            )
                        )
                    ),

                    /* Bar Chart */
                    React.createElement('div', null,
                    React.createElement('div', { className: "flex items-center justify-center gap-2" },
                        React.createElement('h3', { className: "text-xl font-semibold text-center" }, "Desglose por Tarea"),
                        React.createElement('button', { onClick: () => setIsGoalModalOpen(true), className: "text-gray-400 hover:text-white transition-colors", 'aria-label': "Configurar objetivos" },
                            React.createElement(CogIcon, null)
                        )
                    ),
                    React.createElement('div', { style: { width: '100%', height: Math.max(chartData.length * 60 + 20, 100), marginTop: '1rem' } },
                        React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                        React.createElement(BarChart,
                            {
                            layout: "vertical",
                            data: chartData,
                            margin: { top: 5, right: 60, left: 5, bottom: 5 },
                            barCategoryGap: "35%"
                            },
                            React.createElement(XAxis, { type: "number", hide: true }),
                            React.createElement(YAxis, 
                            { 
                                type: "category", 
                                dataKey: "name",
                                width: 100,
                                tickLine: false,
                                axisLine: false,
                                tick: { fill: '#e0e0e0', fontSize: 14 },
                                tickFormatter: (value, index) => `${chartData[index]?.icon || ''} ${value}`
                            }),
                            React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null), cursor: { fill: 'rgba(255, 255, 255, 0.1)' } }),
                            React.createElement(Bar, { dataKey: (data) => data.goal?.duration || 0, barSize: 24, radius: [4, 4, 4, 4], isAnimationActive: !activeEntry},
                                chartData.map((entry, index) => {
                                    const { value, goal } = entry;
                                    let color = "transparent";
                                    if (goal && goal.duration > 0) {
                                        if (goal.type === 'min') {
                                            color = value >= goal.duration ? '#22c55e' : '#4b5563';
                                        } else { // max
                                            color = value > goal.duration ? '#ef4444' : '#22c55e';
                                        }
                                    }
                                    return React.createElement(Cell, { key: `cell-goal-${index}`, fill: color });
                                }),
                                React.createElement(LabelList, { dataKey: "goal.duration", content: renderGoalLabel })
                            ),
                            React.createElement(Bar, { dataKey: "value", barSize: 12, radius: [2, 2, 2, 2], isAnimationActive: !activeEntry },
                            chartData.map((entry, index) => (
                                React.createElement(Cell, { key: `cell-progress-${index}`, fill: entry.fill })
                            )),
                            React.createElement(LabelList, { dataKey: "value", content: renderProgressLabel })
                            )
                        )
                        )
                    )
                    )
                )
            ) : (
                React.createElement('div', { className: "text-center py-10" },
                React.createElement('p', { className: "text-gray-400" }, "No hay datos para este período."),
                React.createElement('p', { className: "text-sm text-gray-500" }, "Registra algunas actividades o completa tareas para ver tus estadísticas.")
                )
            )
        )
      )
    )
  );
};

export default StatsView;
