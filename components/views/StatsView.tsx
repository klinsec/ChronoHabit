import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid, PieChart, Pie } from 'recharts';
import { formatDuration } from '../../utils/helpers';
import { GoalPeriod, GoalType } from '../../types';
import { CogIcon } from '../Icons';

type Period = 'day' | 'week' | 'month' | 'all';

// Modal component for managing all goals
const GoalsModal: React.FC<{ onClose: () => void; period: 'day' | 'week' }> = ({ onClose, period }) => {
    const { tasks, goals, setGoal, deleteGoal } = useTimeTracker();
    const title = period === 'day' ? 'Gestionar Objetivos Diarios' : 'Gestionar Objetivos Semanales';

    type LocalGoal = { type: GoalType | 'none'; duration: number; };
    const [localGoals, setLocalGoals] = useState<Record<string, LocalGoal>>(() => {
        const initialState: Record<string, LocalGoal> = {};
        tasks.forEach(task => {
            const existingGoal = goals.find(g => g.taskId === task.id && g.period === period);
            if (existingGoal) {
                initialState[task.id] = { type: existingGoal.type, duration: existingGoal.duration };
            } else {
                initialState[task.id] = { type: 'none', duration: 0 };
            }
        });
        return initialState;
    });

    const handleChange = (taskId: string, field: keyof LocalGoal, value: any) => {
        setLocalGoals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value }}));
    };

    const handleDurationChange = (taskId: string, unit: 'hours' | 'minutes', value: string) => {
        const numValue = parseInt(value) || 0;
        const currentDuration = localGoals[taskId].duration;
        const newDuration = unit === 'hours'
            ? (numValue * 3600000) + (currentDuration % 3600000)
            : (Math.floor(currentDuration / 3600000) * 3600000) + (numValue * 60000);
        handleChange(taskId, 'duration', newDuration);
    };

    const handleSave = () => {
        Object.keys(localGoals).forEach((taskId) => {
            const goalData = localGoals[taskId];
            if (goalData.type !== 'none' && goalData.duration > 0) {
                setGoal({ taskId, type: goalData.type, period: period, duration: goalData.duration });
            } else {
                deleteGoal(taskId, period);
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-2xl p-6 w-full max-w-sm flex flex-col max-h-[90vh]">
                <h2 className="text-xl font-bold mb-4 flex-shrink-0">{title}</h2>
                <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
                    {tasks.map(task => {
                        const goal = localGoals[task.id];
                        const hours = Math.floor(goal.duration / 3600000);
                        const minutes = Math.floor((goal.duration % 3600000) / 60000);
                        return (
                            <div key={task.id} className="border-t border-gray-700 pt-4">
                                <p className="font-bold mb-2">{task.icon} {task.name}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    <select value={goal.type} onChange={e => handleChange(task.id, 'type', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white col-span-2">
                                        <option value="none">Ninguno</option>
                                        <option value="min">Mínimo</option>
                                        <option value="max">Máximo</option>
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={hours} onChange={e => handleDurationChange(task.id, 'hours', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" disabled={goal.type === 'none'} min="0" />
                                        <span className="text-gray-400">h</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={minutes} onChange={e => handleDurationChange(task.id, 'minutes', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" disabled={goal.type === 'none'} min="0" max="59"/>
                                        <span className="text-gray-400">m</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-gray-700 flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                    <button type="button" onClick={handleSave} className="bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg">Guardar</button>
                </div>
            </div>
        </div>
    );
};

const DateNavigator: React.FC<{
    period: Period;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    dateRangeDisplay: string;
}> = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {
    
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

const StatsView: React.FC = () => {
  const { timeEntries, getTaskById, tasks, getGoalByTaskIdAndPeriod, activeEntry, liveElapsedTime } = useTimeTracker();
  const [period, setPeriod] = useState<Period>('week');
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setCurrentDate(new Date());
  }, [period]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    let start: Date;
    let end: Date;
    let display: string;

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
        start = new Date(0);
        end = new Date();
        display = 'Todo';
        break;
    }
    return { start: start.getTime(), end: end.getTime(), display };
  }, [period, currentDate]);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter(e => e.endTime && e.startTime >= dateRange.start && e.startTime <= dateRange.end);
  }, [timeEntries, dateRange]);

  const taskDurations = useMemo<{[taskId: string]: number}>(() => {
    const durations: { [taskId: string]: number } = {};
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

  const pieData = useMemo(() => {
    return Object.entries(taskDurations)
      .map(([taskId, duration]) => {
          const task = getTaskById(taskId);
          return {
            name: task?.name || 'Unknown',
            value: duration,
            fill: task?.color || '#8884d8',
          };
      })
      .filter(item => Number(item.value) > 0)
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [taskDurations, getTaskById]);

  const barData = useMemo(() => {
    return tasks.map(task => {
        const duration = taskDurations[task.id] || 0;
        const goal = (period === 'day' || period === 'week') ? getGoalByTaskIdAndPeriod(task.id, period) : undefined;
        const goalDuration = goal?.duration || 0;

        const taskFill = task.color;
        let goalFill = '#4A5568'; // Gris por defecto (sin objetivo, o mínimo sin cumplir)

        if (goalDuration > 0) {
            if (goal?.type === 'max') {
                goalFill = duration > goalDuration ? '#ef4444' : '#22c55e'; // Rojo si se excede, si no verde
            } else if (goal?.type === 'min' && duration >= goalDuration) {
                goalFill = '#22c55e'; // Verde si se cumple
            }
        }

        return {
            name: task.name,
            value: duration,
            goal: goalDuration,
            taskFill: taskFill,
            goalFill: goalFill,
        };
    })
    .filter(item => item.value > 0 || item.goal > 0)
    .sort((a, b) => (Number(b.goal) + Number(b.value)) - (Number(a.goal) + Number(a.value)));

  }, [tasks, taskDurations, getGoalByTaskIdAndPeriod, period]);
  
  const maxDomainValue = useMemo(() => {
    if (!barData || barData.length === 0) {
      return 3600000; // Default to 1 hour if no data
    }
    const maxVal = Math.max(...barData.map(d => Math.max(d.value, d.goal)));
    // Add 10% padding for better visualization, and handle the case where maxVal is 0.
    return maxVal > 0 ? maxVal * 1.1 : 3600000; 
  }, [barData]);

  const totalDuration = useMemo(() => Object.values(taskDurations).reduce((sum, item) => sum + item, 0), [taskDurations]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload.find(p => p.dataKey === 'value')?.payload || payload[0]?.payload;
      const { name, value, goal } = data as { name: string, value: number, goal?: number };
      const percentage = totalDuration > 0 ? ((value / totalDuration) * 100).toFixed(1) : 0;
      return (
        <div className="bg-surface p-2 border border-gray-700 rounded-md shadow-lg">
          <p className="font-bold">{name}</p>
          <p>Tiempo: {formatDuration(value)}</p>
          {goal != null && goal > 0 && <p>Objetivo: {formatDuration(goal)}</p>}
          {totalDuration > 0 && <p>Porcentaje: {percentage}%</p>}
        </div>
      );
    }
    return null;
  };

  const periodLabels: {[key in Period]: string} = { day: 'Día', week: 'Semana', month: 'Mes', all: 'Todo' };

  return (
    <div className="space-y-8">
      
      {isGoalsModalOpen && (period === 'day' || period === 'week') && (
        <GoalsModal onClose={() => setIsGoalsModalOpen(false)} period={period} />
      )}

      <div>
        <div className="flex justify-center bg-surface p-1 rounded-xl mb-4">
            {(['day', 'week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${period === p ? 'bg-primary text-bkg' : 'text-gray-300 hover:bg-gray-700'}`}>
                {periodLabels[p]}
            </button>
            ))}
        </div>
        
        <DateNavigator period={period} currentDate={currentDate} setCurrentDate={setCurrentDate} dateRangeDisplay={dateRange.display} />

        {barData.length > 0 || pieData.length > 0 ? (
            <>
            <div>
                 <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xl font-semibold">Tiempo Total por Tarea</h3>
                    <button 
                        onClick={() => setIsGoalsModalOpen(true)} 
                        className="flex items-center space-x-2 bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg hover:bg-gray-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={period === 'month' || period === 'all'}
                    >
                        <CogIcon />
                        <span>Gestionar</span>
                    </button>
                </div>
                <p className="text-gray-400 text-sm mb-4">La barra de fondo es tu objetivo. Mínimo: verde al cumplirlo. Máximo: verde, y rojo al superarlo.</p>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart key={period + dateRange.start} data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                            <XAxis type="number" tickFormatter={(ms) => `${(ms / 3600000).toFixed(1)}h`} stroke="#a0aec0" domain={[0, maxDomainValue]} />
                            <YAxis yAxisId="left" type="category" dataKey="name" width={80} stroke="#a0aec0" interval={0} tick={{ fontSize: 12 }}/>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(187, 134, 252, 0.1)' }}/>
                            <Bar yAxisId="left" dataKey="goal" barSize={20}>
                               {barData.map((entry, index) => <Cell key={`cell-goal-${index}`} fill={entry.goalFill} />)}
                            </Bar>
                            <Bar yAxisId="left" dataKey="value" barSize={14} minPointSize={2}>
                                {barData.map((entry, index) => <Cell key={`cell-value-${index}`} fill={entry.taskFill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {pieData.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-2 mt-8 text-center">Distribución del Tiempo</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <Pie 
                                    data={pieData} 
                                    cx="50%" 
                                    cy="50%"
                                    nameKey="name"
                                    dataKey="value"
                                    innerRadius="60%"
                                    outerRadius="80%"
                                    paddingAngle={5}
                                    labelLine={false}
                                    isAnimationActive={!activeEntry} // Disable animation on live updates for performance
                                >
                                    {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            </>
        ) : (
            <div className="text-center py-10">
            <p className="text-gray-400">No hay datos para este período.</p>
            <p className="text-sm text-gray-500">Registra algunas actividades para ver tus estadísticas.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;