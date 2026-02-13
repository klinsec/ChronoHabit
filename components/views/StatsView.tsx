
import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid } from 'recharts';
import { formatDuration } from '../../utils/helpers';
import { CogIcon, EditIcon, StarIcon, PlusIcon, TrashIcon, CopyIcon, UsersIcon } from '../Icons';
import GoalModal from '../modals/GoalModal';
import { GoalPeriod } from '../../types';

interface DateNavigatorProps {
    period: GoalPeriod;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    dateRangeDisplay: string;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {
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
        <div className="flex items-center justify-between mb-4 bg-surface p-2 rounded-xl">
            <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col items-center">
                <span className="font-bold text-lg text-on-surface">{dateRangeDisplay}</span>
                <button onClick={() => setCurrentDate(new Date())} className="text-xs text-secondary hover:underline">Hoy</button>
            </div>
            <button onClick={handleNext} disabled={isNextDisabled()} className="p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    let colorClass = "bg-gray-700 text-gray-300";
    if (rank === 1) { colorClass = "bg-yellow-500/20 text-yellow-500"; }
    else if (rank === 2) { colorClass = "bg-gray-400/20 text-gray-300"; }
    else if (rank === 3) { colorClass = "bg-orange-600/20 text-orange-500"; }

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${colorClass} text-sm`}>
            {rank}
        </div>
    );
};

const RankingTable = ({ data, localUser, title, icon, showFooterSelf = false, onRemoveItem, filterZero = false, limit }: any) => {
    let activeUsers = data ? [...data] : [];

    // Merge local user if not present (for visual consistency)
    if (localUser) {
        const exists = activeUsers.find(u => u.id === localUser.id);
        if (!exists) {
            activeUsers.push(localUser);
        } else {
            // Update local user in list with latest local data
            activeUsers = activeUsers.map(u => u.id === localUser.id ? { ...u, points: localUser.points, username: localUser.username, photo: localUser.photo } : u);
        }
    }

    if (filterZero) {
        activeUsers = activeUsers.filter(u => u.points > 0 || (localUser && u.id === localUser.id));
    }

    // Sort descending
    activeUsers.sort((a, b) => b.points - a.points);
    
    const currentUserId = localUser?.id;
    const selfIndex = activeUsers.findIndex(u => u.id === currentUserId);
    const selfData = selfIndex >= 0 ? { ...activeUsers[selfIndex], rank: selfIndex + 1 } : null;
    
    const displayUsers = limit ? activeUsers.slice(0, limit) : activeUsers;
    const isSelfInTop = selfIndex >= 0 && (limit ? selfIndex < limit : true);

    return (
        <div className="bg-surface rounded-2xl overflow-hidden border border-gray-800 shadow-lg mb-6">
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 w-16">Pos</th>
                            <th className="px-4 py-3">Usuario</th>
                            <th className="px-4 py-3 text-right">Puntos</th>
                            {onRemoveItem && <th className="px-2 py-3 w-8"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayUsers.length === 0 ? (
                            <tr>
                                <td colSpan={onRemoveItem ? 4 : 3} className="px-4 py-6 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span>😴 Sin datos aún</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayUsers.map((user, index) => (
                                <tr 
                                    key={user.id || index} 
                                    className={`border-b border-gray-800 transition-colors ${user.id === currentUserId ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-800/50'}`}
                                >
                                    <td className="px-4 py-3 font-medium">
                                        <RankBadge rank={index + 1} />
                                    </td>
                                    <td className={`px-4 py-3 ${user.id === currentUserId ? 'font-bold text-primary' : 'text-gray-300'}`}>
                                        <div className="flex items-center gap-2">
                                            {user.photo ? (
                                                <img src={user.photo} alt="Avatar" className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {user.username?.[0]?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span>{user.username || 'Anónimo'}</span>
                                                {user.id === currentUserId && <span className="text-[10px] text-gray-500">(Tú)</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                        {Math.floor(user.points || 0).toLocaleString()}
                                    </td>
                                    {onRemoveItem && <td className="px-2 py-3 text-center">
                                        {user.id !== currentUserId && (
                                            <button onClick={() => onRemoveItem(user.id)} className="text-gray-600 hover:text-red-500">
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </td>}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {limit && activeUsers.length > limit && (
                 <div className="px-4 py-2 bg-gray-900/30 text-center text-xs text-gray-500 font-mono tracking-widest">...</div>
            )}
            {showFooterSelf && !isSelfInTop && selfData && (
                <div className="border-t border-gray-700 bg-gray-800 p-3 flex justify-between items-center animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs uppercase">Tu Posición:</span>
                        <RankBadge rank={selfData.rank} />
                    </div>
                    <span className="font-mono font-bold text-primary">{Math.floor(selfData.points).toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

const RankingView = () => {
    const { firebaseUser, handleLoginRanking, handleLogoutRanking, leaderboard, calculateTotalScore, addFriend, removeFriend, rankingError, localFriends } = useTimeTracker();
    const [friendInput, setFriendInput] = useState('');

    const handleAddFriend = () => {
        if (friendInput.trim()) {
            addFriend(friendInput.trim());
            setFriendInput('');
        }
    };

    const copyUserId = () => {
        if (firebaseUser) {
            navigator.clipboard.writeText(firebaseUser.uid).then(() => {
                alert("ID copiado: " + firebaseUser.uid);
            });
        }
    };

    const myScore = calculateTotalScore();
    
    if (!firebaseUser) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center animate-in fade-in">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <div className="transform scale-150"><StarIcon /></div>
                </div>
                <h2 className="text-xl font-bold text-white">Ranking Global</h2>
                <p className="text-gray-400 text-sm max-w-xs">
                    Inicia sesión con Google para guardar tu puntuación y competir en la tabla de clasificación.
                </p>
                <button 
                    onClick={handleLoginRanking}
                    className="bg-white text-black font-bold py-3 px-6 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Iniciar con Google
                </button>
            </div>
        );
    }

    const localUserObj = {
        id: firebaseUser.uid,
        username: firebaseUser.displayName || 'Yo',
        photo: firebaseUser.photoURL,
        points: myScore
    };

    const friendsData = (leaderboard || []).filter((u: any) => localFriends.includes(u.id));
    const globalData = leaderboard || []; 

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            
            {rankingError && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg text-xs break-words">
                    <p className="font-bold mb-1">⚠️ Error de Conexión</p>
                    <p className="font-mono bg-black/20 p-1 rounded mb-2">{String(rankingError)}</p>
                </div>
            )}

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-2xl border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {localUserObj.photo ? (
                                <img src={localUserObj.photo} className="w-10 h-10 rounded-full border-2 border-primary" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">
                                    {localUserObj.username[0]?.toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white">{localUserObj.username}</h2>
                                <p className="text-[10px] text-green-400">● Online</p>
                            </div>
                        </div>
                        <div onClick={copyUserId} className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-primary transition-colors bg-black/20 w-fit px-2 py-1 rounded">
                            <span>Copiar ID</span>
                            <CopyIcon />
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">PUNTUACIÓN</p>
                        <p className="text-2xl font-mono font-bold text-primary">{myScore.toLocaleString()}</p>
                    </div>
                </div>
                <button onClick={handleLogoutRanking} className="text-xs text-red-400 hover:text-red-300 mt-2 underline">Cerrar sesión</button>
            </div>

            <div>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={friendInput}
                        onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="Añadir amigo por ID..."
                        className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-500"
                    />
                    <button onClick={handleAddFriend} className="bg-gray-700 hover:bg-primary hover:text-bkg text-white px-3 rounded-lg transition-colors">
                        <PlusIcon />
                    </button>
                </div>
                <RankingTable 
                    title="Amigos" 
                    icon={<UsersIcon />}
                    data={friendsData} 
                    localUser={localUserObj}
                    onRemoveItem={removeFriend}
                    filterZero={false}
                />
            </div>

            <RankingTable 
                title="Top Global" 
                icon={<StarIcon />}
                data={globalData} 
                localUser={localUserObj}
                showFooterSelf={true}
                filterZero={false} 
                limit={10}
            />
        </div>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const { name, value, goal } = data;
      // We don't have access to totalDuration here easily without prop drilling, 
      // but we can just show value.
      return (
        <div className="bg-surface p-2 border border-gray-700 rounded-md shadow-lg text-sm">
          <p className="font-bold text-base">{name}</p>
          <p>Progreso: {formatDuration(value)}</p>
          {goal && <p>Objetivo: {formatDuration(goal.duration)} ({goal.type === 'min' ? 'mínimo' : 'máximo'})</p>}
        </div>
      );
    }
    return null;
};

const UnifiedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
        return (
          <div className="bg-surface p-3 border border-gray-700 rounded-xl shadow-lg text-sm">
              <p className="font-bold text-base text-white mb-2 border-b border-gray-700 pb-1">{label}</p>
              {payload.map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-gray-300 capitalize">{entry.name}:</span>
                      <span className="font-bold text-white">{parseFloat(entry.value.toFixed(1))} pts</span>
                  </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                  <span className="font-bold text-gray-400">Total:</span>
                  <span className="font-bold text-white text-lg">{parseFloat(total.toFixed(1))}</span>
              </div>
          </div>
        );
    }
    return null;
};

const renderProgressLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
    const formattedValue = formatDuration(value);
    return (
        <text x={x + width + 5} y={y + 10} fill="#e0e0e0" textAnchor="start" dominantBaseline="middle" className="text-xs font-mono">
            {formattedValue}
        </text>
    );
};

const renderGoalLabel = (props: any) => {
    const { x, y, width, goal } = props;
    if (!goal || goal.duration === 0) return null;
    const formattedValue = formatDuration(goal.duration);
    return (
         <text x={x + width + 5} y={y + 18} fill="#a0a0a0" textAnchor="start" dominantBaseline="middle" className="text-xs font-mono">
            {formattedValue}
        </text>
    );
};

const StatsView: React.FC = () => {
  const { timeEntries, getTaskById, activeEntry, liveElapsedTime, getGoalByTaskIdAndPeriod, subtasks, contract, pastContracts } = useTimeTracker();
  const [activeTab, setActiveTab] = useState<'charts' | 'ranking'>('charts');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  useEffect(() => { setCurrentDate(new Date()); }, [period]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    let start: Date, end: Date, display: string;
    
    switch (period) {
      case 'day':
        start = new Date(targetDate); start.setHours(0, 0, 0, 0);
        end = new Date(targetDate); end.setHours(23, 59, 59, 999);
        display = start.getTime() === today.getTime() ? 'Hoy' : start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        break;
      case 'week':
        const dayOfWeek = targetDate.getDay();
        const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(targetDate.setDate(diff)); start.setHours(0, 0, 0, 0);
        end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        const todayWeekStart = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)));
        todayWeekStart.setHours(0,0,0,0);
        display = start.getTime() === todayWeekStart.getTime() ? "Esta Semana" : `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
        break;
      case 'month':
        start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
        display = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        break;
      case 'all': default:
        start = new Date(targetDate.getFullYear(), 0, 1);
        end = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        display = `${targetDate.getFullYear()}`;
    }
    return { start: start.getTime(), end: end.getTime(), display };
  }, [period, currentDate]);

  const filteredEntries = useMemo(() => timeEntries.filter(e => e.endTime && e.startTime >= dateRange.start && e.startTime <= dateRange.end), [timeEntries, dateRange]);
  
  const taskDurations = useMemo(() => {
      const d: any = {};
      filteredEntries.forEach(e => { if(e.endTime) d[e.taskId] = (d[e.taskId]||0) + (e.endTime - e.startTime); });
      if(activeEntry && Date.now() >= dateRange.start && Date.now() <= dateRange.end) {
          d[activeEntry.taskId] = (d[activeEntry.taskId]||0) + (Date.now() - Math.max(activeEntry.startTime, dateRange.start));
      }
      return d;
  }, [filteredEntries, activeEntry, liveElapsedTime, dateRange]);
  
  const chartData = useMemo(() => Object.entries(taskDurations).map(([id, val]) => ({ name: getTaskById(id)?.name, value: val, fill: getTaskById(id)?.color, icon: getTaskById(id)?.icon, goal: getGoalByTaskIdAndPeriod(id, period) })).filter((i:any) => Number(i.value)>0 || (i.goal && i.goal.duration > 0)).sort((a:any,b:any) => Number(b.value)-Number(a.value)), [taskDurations]);

  const unifiedPointsData = useMemo(() => {
      const bucketType = (period === 'week' || period === 'month') ? 'day' : 'month';
      const dataMap = new Map();
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      let cursor = new Date(startDate);
      while (cursor <= endDate) {
          let key = '';
          if (bucketType === 'day') { key = cursor.toISOString().split('T')[0]; cursor.setDate(cursor.getDate() + 1); } 
          else { key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`; cursor.setMonth(cursor.getMonth() + 1); }
          dataMap.set(key, { timer: 0, tasks: 0, routine: 0 });
      }
      
      // Timer Points
      filteredEntries.forEach(entry => {
          if (!entry.endTime) return;
          const entryDate = new Date(entry.startTime);
          let key = bucketType === 'day' ? entryDate.toISOString().split('T')[0] : `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
          if (dataMap.has(key)) {
              const current = dataMap.get(key);
              current.timer += ((entry.endTime - entry.startTime) / (1000 * 60 * 60)) * 0.5;
          }
      });

      // Task Points
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

      // Routine Points (From History only - Avoid double counting with live contract)
      const allDailyHistory = [
          ...(contract?.dailyHistory || []),
          ...pastContracts.flatMap(c => c.dailyHistory || [])
      ];

      allDailyHistory.forEach(dayHistory => {
          const historyDate = new Date(dayHistory.date);
          if (historyDate.getTime() >= dateRange.start && historyDate.getTime() <= dateRange.end) {
              let key = dayHistory.date; // already YYYY-MM-DD
              if (bucketType === 'month') {
                  key = `${historyDate.getFullYear()}-${String(historyDate.getMonth() + 1).padStart(2, '0')}`;
              }
              
              if (dataMap.has(key)) {
                  const current = dataMap.get(key);
                  // dailyHistory contains the finalized or live points for that day
                  current.routine += dayHistory.points;
              }
          }
      });

      return Array.from(dataMap.entries()).map(([dateKey, values]: any) => {
          const [year, month, day] = dateKey.split('-').map(Number);
          let label = bucketType === 'day' ? new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'narrow', day: 'numeric' }) : new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'short' });
          return { date: label, ...values, total: values.timer + values.tasks + values.routine };
      });
  }, [filteredEntries, subtasks, contract, pastContracts, period, dateRange]); 

  return (
    <div className="space-y-6">
      {isGoalModalOpen && <GoalModal period={period} onClose={() => setIsGoalModalOpen(false)} />}
      
      <div className="flex bg-gray-800 p-1 rounded-xl mb-4">
          <button onClick={() => setActiveTab('charts')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'charts' ? 'bg-surface text-primary shadow-md' : 'text-gray-400 hover:text-white'}`}>Gráficas</button>
          <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-surface text-yellow-500 shadow-md' : 'text-gray-400 hover:text-white'}`}>Ranking 🏆</button>
      </div>

      {activeTab === 'ranking' ? <RankingView /> : (
          <div>
             <div className="flex justify-center bg-surface p-1 rounded-xl mb-4">
                {(['day', 'week', 'month', 'all'] as GoalPeriod[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`w-full py-2 text-sm font-semibold rounded-lg ${period === p ? 'bg-primary text-bkg' : 'text-gray-300'}`}>
                        {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                    </button>
                ))}
             </div>
             
             <DateNavigator period={period} currentDate={currentDate} setCurrentDate={setCurrentDate} dateRangeDisplay={dateRange.display} />

             {chartData.length > 0 || unifiedPointsData.some((d: any) => d.total > 0) ? (
                <div className="space-y-10">
                    {/* Unified Stacked Bar Chart */}
                    {period !== 'day' && (
                        <div className="bg-surface/30 p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-center text-white">Puntos Totales (Diario)</h3>
                            </div>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={unifiedPointsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fill: '#888', fontSize: 10 }} 
                                            axisLine={false} 
                                            tickLine={false}
                                            interval={period === 'month' ? 2 : 0}
                                        />
                                        <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<UnifiedTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="timer" name="Cronómetro" stackId="a" fill="#bb86fc" radius={[0,0,4,4]} barSize={20} />
                                        <Bar dataKey="tasks" name="Tareas" stackId="a" fill="#eab308" barSize={20} />
                                        <Bar dataKey="routine" name="Rutina" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-center">Distribución del Tiempo</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <Pie data={chartData} cx="50%" cy="50%" nameKey="name" dataKey="value" innerRadius="60%" outerRadius="80%" paddingAngle={5} labelLine={false}>
                                        {chartData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <div>
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-xl font-semibold text-center">Desglose por Tarea</h3>
                        <button onClick={() => setIsGoalModalOpen(true)} className="text-gray-400 hover:text-white transition-colors">
                            <CogIcon />
                        </button>
                      </div>
                      <div style={{ width: '100%', height: Math.max(chartData.length * 60 + 20, 100), marginTop: '1rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 60, left: 5, bottom: 5 }} barCategoryGap="35%">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} tick={{ fill: '#e0e0e0', fontSize: 14 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                            <Bar dataKey="value" barSize={12} radius={[2, 2, 2, 2]}>
                              {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-progress-${index}`} fill={entry.fill} />
                              ))}
                               <LabelList dataKey="value" content={renderProgressLabel} />
                            </Bar>
                            <Bar dataKey={(data: any) => data.goal?.duration || 0} barSize={24} radius={[4, 4, 4, 4]}>
                                {chartData.map((entry: any, index: number) => {
                                    const { value, goal } = entry;
                                    let color = "transparent";
                                    if (goal && goal.duration > 0) {
                                        if (goal.type === 'min') {
                                            color = value >= goal.duration ? '#22c55e' : '#4b5563';
                                        } else { // max
                                            color = value > goal.duration ? '#ef4444' : '#22c55e';
                                        }
                                    }
                                    return <Cell key={`cell-goal-${index}`} fill={color} />;
                                })}
                                <LabelList dataKey="goal.duration" content={renderGoalLabel} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                </div>
             ) : (
                <div className="text-center py-10">
                    <p className="text-gray-400">No hay datos para este período.</p>
                </div>
             )}
          </div>
      )}
    </div>
  );
};

export default StatsView;
