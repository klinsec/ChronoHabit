import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList } from 'recharts';
import { formatDuration } from '../../utils/helpers';
import { Goal, GoalPeriod } from '../../types';
import { CogIcon } from '../Icons';
import GoalModal from '../modals/GoalModal';

type Period = GoalPeriod;

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

interface ChartData {
    name: string;
    value: number;
    fill: string;
    icon: string;
    goal: Goal | undefined;
    // FIX: Added index signature to make the type compatible with recharts.
    [key: string]: any;
}

const StatsView: React.FC = () => {
  const { timeEntries, getTaskById, activeEntry, liveElapsedTime, getGoalByTaskIdAndPeriod } = useTimeTracker();
  const [period, setPeriod] = useState<Period>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

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

  const chartData: ChartData[] = useMemo(() => {
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
  
  const totalDuration = useMemo(() => Object.values(taskDurations).reduce((sum, item) => sum + item, 0), [taskDurations]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const { name, value, goal } = data;
      const percentage = totalDuration > 0 ? ((value / totalDuration) * 100).toFixed(1) : 0;
      return (
        <div className="bg-surface p-2 border border-gray-700 rounded-md shadow-lg text-sm">
          <p className="font-bold text-base">{name}</p>
          <p>Progreso: {formatDuration(value)}</p>
          {goal && <p>Objetivo: {formatDuration(goal.duration)} ({goal.type === 'min' ? 'mínimo' : 'máximo'})</p>}
          {totalDuration > 0 && <p>Porcentaje: {percentage}%</p>}
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

  const periodLabels: {[key in Period]: string} = { day: 'Día', week: 'Semana', month: 'Mes', all: 'Todo' };

  return (
    <div className="space-y-8">
      {isGoalModalOpen && <GoalModal period={period} onClose={() => setIsGoalModalOpen(false)} />}
      <div>
        <div className="flex justify-center bg-surface p-1 rounded-xl mb-4">
            {(['day', 'week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${period === p ? 'bg-primary text-bkg' : 'text-gray-300 hover:bg-gray-700'}`}>
                {periodLabels[p]}
            </button>
            ))}
        </div>
        
        <DateNavigator period={period} currentDate={currentDate} setCurrentDate={setCurrentDate} dateRangeDisplay={dateRange.display} />

        {chartData.length > 0 ? (
            <div className="space-y-10">
                <div>
                    <h3 className="text-xl font-semibold mb-2 text-center">Distribución del Tiempo</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <Pie 
                                    data={chartData} 
                                    cx="50%" 
                                    cy="50%"
                                    nameKey="name"
                                    dataKey="value"
                                    innerRadius="60%"
                                    outerRadius="80%"
                                    paddingAngle={5}
                                    labelLine={false}
                                    isAnimationActive={!activeEntry}
                                >
                                    {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />))}
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
                    <button onClick={() => setIsGoalModalOpen(true)} className="text-gray-400 hover:text-white transition-colors" aria-label="Configurar objetivos">
                        <CogIcon />
                    </button>
                  </div>
                  <div style={{ width: '100%', height: chartData.length * 60 + 20, marginTop: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
                        barCategoryGap="35%"
                      >
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name"
                          width={100}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#e0e0e0', fontSize: 14 }}
                          tickFormatter={(value, index) => `${chartData[index]?.icon || ''} ${value}`}
                          />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                        <Bar dataKey={(data) => data.goal?.duration || 0} barSize={24} radius={[4, 4, 4, 4]} isAnimationActive={!activeEntry}>
                            {chartData.map((entry, index) => {
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
                        <Bar dataKey="value" barSize={12} radius={[2, 2, 2, 2]} isAnimationActive={!activeEntry}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-progress-${index}`} fill={entry.fill} />
                          ))}
                           <LabelList dataKey="value" content={renderProgressLabel} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
            </div>
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