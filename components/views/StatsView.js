import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatDuration } from '../../utils/helpers.js';
import { CogIcon } from '../Icons.js';

// Modal component for managing all goals
const GoalsModal = ({ onClose, period }) => {
    const { tasks, goals, setGoal, deleteGoal } = useTimeTracker();
    const title = period === 'day' ? 'Gestionar Objetivos Diarios' : 'Gestionar Objetivos Semanales';

    const [localGoals, setLocalGoals] = useState(() => {
        const initialState = {};
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

    const handleChange = (taskId, field, value) => {
        setLocalGoals(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value }}));
    };

    const handleDurationChange = (taskId, unit, value) => {
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
        React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
            React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm flex flex-col max-h-[90vh]" },
                React.createElement('h2', { className: "text-xl font-bold mb-4 flex-shrink-0" }, title),
                React.createElement('div', { className: "space-y-4 overflow-y-auto pr-2 flex-grow" },
                    tasks.map(task => {
                        const goal = localGoals[task.id];
                        const hours = Math.floor(goal.duration / 3600000);
                        const minutes = Math.floor((goal.duration % 3600000) / 60000);
                        return (
                            React.createElement('div', { key: task.id, className: "border-t border-gray-700 pt-4" },
                                React.createElement('p', { className: "font-bold mb-2" }, `${task.icon} ${task.name}`),
                                React.createElement('div', { className: "grid grid-cols-2 gap-x-4 gap-y-2" },
                                    React.createElement('select', { value: goal.type, onChange: e => handleChange(task.id, 'type', e.target.value), className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white col-span-2" },
                                        React.createElement('option', { value: "none" }, "Ninguno"),
                                        React.createElement('option', { value: "min" }, "Mínimo"),
                                        React.createElement('option', { value: "max" }, "Máximo")
                                    ),
                                    React.createElement('div', { className: "flex items-center gap-2" },
                                        React.createElement('input', { type: "number", value: hours, onChange: e => handleDurationChange(task.id, 'hours', e.target.value), className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white", disabled: goal.type === 'none', min: "0" }),
                                        React.createElement('span', { className: "text-gray-400" }, "h")
                                    ),
                                    React.createElement('div', { className: "flex items-center gap-2" },
                                        React.createElement('input', { type: "number", value: minutes, onChange: e => handleDurationChange(task.id, 'minutes', e.target.value), className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white", disabled: goal.type === 'none', min: "0", max: "59"}),
                                        React.createElement('span', { className: "text-gray-400" }, "m")
                                    )
                                )
                            )
                        );
                    })
                ),
                React.createElement('div', { className: "flex justify-end space-x-2 pt-4 mt-2 border-t border-gray-700 flex-shrink-0" },
                    React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" }, "Cancelar"),
                    React.createElement('button', { type: "button", onClick: handleSave, className: "bg-primary hover:bg-purple-500 text-bkg font-bold py-2 px-4 rounded-lg" }, "Guardar")
                )
            )
        )
    );
};

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

const StatsView = () => {
  const { timeEntries, getTaskById, tasks, getGoalByTaskIdAndPeriod, activeEntry, liveElapsedTime } = useTimeTracker();
  const [period, setPeriod] = useState('week');
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload.find(p => p.dataKey === 'value')?.payload || payload[0]?.payload;
      const { name, value, goal } = data;
      const percentage = totalDuration > 0 ? ((value / totalDuration) * 100).toFixed(1) : 0;
      return (
        React.createElement('div', { className: "bg-surface p-2 border border-gray-700 rounded-md shadow-lg" },
          React.createElement('p', { className: "font-bold" }, name),
          React.createElement('p', null, `Tiempo: ${formatDuration(value)}`),
          goal != null && goal > 0 && React.createElement('p', null, `Objetivo: ${formatDuration(goal)}`),
          totalDuration > 0 && React.createElement('p', null, `Porcentaje: ${percentage}%`)
        )
      );
    }
    return null;
  };

  const periodLabels = { day: 'Día', week: 'Semana', month: 'Mes', all: 'Todo' };

  return (
    React.createElement('div', { className: "space-y-8" },
      isGoalsModalOpen && (period === 'day' || period === 'week') && (
        React.createElement(GoalsModal, { onClose: () => setIsGoalsModalOpen(false), period: period })
      ),
      React.createElement('div', null,
        React.createElement('div', { className: "flex justify-center bg-surface p-1 rounded-xl mb-4" },
            ['day', 'week', 'month', 'all'].map(p => (
            React.createElement('button', { key: p, onClick: () => setPeriod(p), className: `w-full py-2 text-sm font-semibold rounded-lg transition-colors ${period === p ? 'bg-primary text-bkg' : 'text-gray-300 hover:bg-gray-700'}` },
                periodLabels[p]
            )
            ))
        ),
        
        React.createElement(DateNavigator, { period: period, currentDate: currentDate, setCurrentDate: setCurrentDate, dateRangeDisplay: dateRange.display }),

        barData.length > 0 || pieData.length > 0 ? (
            React.createElement(React.Fragment, null,
            React.createElement('div', null,
                 React.createElement('div', { className: "flex justify-between items-center mb-1" },
                    React.createElement('h3', { className: "text-xl font-semibold" }, "Tiempo Total por Tarea"),
                    React.createElement('button', 
                        {
                          onClick: () => setIsGoalsModalOpen(true),
                          className: "flex items-center space-x-2 bg-gray-600 text-white font-semibold px-3 py-2 rounded-lg hover:bg-gray-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                          disabled: period === 'month' || period === 'all'
                        },
                        React.createElement(CogIcon, null),
                        React.createElement('span', null, "Gestionar")
                    )
                ),
                React.createElement('p', { className: "text-gray-400 text-sm mb-4" }, "La barra de fondo es tu objetivo. Mínimo: verde al cumplirlo. Máximo: verde, y rojo al superarlo."),
                React.createElement('div', { style: { width: '100%', height: 300 } },
                    React.createElement(ResponsiveContainer, null,
                        React.createElement(BarChart, { data: barData, layout: "vertical", margin: { top: 5, right: 20, left: 20, bottom: 5 } },
                            React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#4a5568" }),
                            React.createElement(XAxis, { type: "number", tickFormatter: (ms) => `${(ms / 3600000).toFixed(1)}h`, stroke: "#a0aec0", domain: [0, maxDomainValue], allowDataOverflow: true }),
                            React.createElement(YAxis, { yAxisId: "left", type: "category", dataKey: "name", width: 80, stroke: "#a0aec0", interval: 0, tick: { fontSize: 12 }}),
                            React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null), cursor: { fill: 'rgba(187, 134, 252, 0.1)' }}),
                            React.createElement(Bar, { yAxisId: "left", dataKey: "goal", barSize: 20, radius: [4, 4, 4, 4] },
                               barData.map((entry, index) => React.createElement(Cell, { key: `cell-goal-${index}`, fill: entry.goalFill }))
                            ),
                            React.createElement(Bar, { yAxisId: "left", dataKey: "value", barSize: 14, radius: [4, 4, 4, 4], minPointSize: 2 },
                                barData.map((entry, index) => React.createElement(Cell, { key: `cell-value-${index}`, fill: entry.taskFill }))
                            )
                        )
                    )
                )
            ),
            pieData.length > 0 && (
                React.createElement('div', null,
                    React.createElement('h3', { className: "text-xl font-semibold mb-2 mt-8 text-center" }, "Distribución del Tiempo"),
                    React.createElement('div', { style: { width: '100%', height: 300 } },
                        React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                            React.createElement(PieChart, { margin: { top: 5, right: 20, left: 20, bottom: 5 } },
                                React.createElement(Pie, 
                                    {
                                      data: pieData, 
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
                                    pieData.map((entry, index) => (React.createElement(Cell, { key: `cell-${index}`, fill: entry.fill, stroke: entry.fill })))
                                ),
                                React.createElement(Tooltip, { content: React.createElement(CustomTooltip, null) }),
                                React.createElement(Legend, null)
                            )
                        )
                    )
                )
            )
            )
        ) : (
            React.createElement('div', { className: "text-center py-10" },
            React.createElement('p', { className: "text-gray-400" }, "No hay datos para este período."),
            React.createElement('p', { className: "text-sm text-gray-500" }, "Registra algunas actividades para ver tus estadísticas.")
            )
        )
      )
    )
  );
};

export default StatsView;