import React, { useState, useEffect, useMemo } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { TrashIcon } from '../Icons.js';

const msToInput = (ms) => {
  if (!ms || ms <= 0) return { hours: '', minutes: '' };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return {
    hours: hours > 0 ? String(hours) : '',
    minutes: minutes > 0 ? String(minutes) : '',
  };
};

const inputToMs = (hours, minutes) => {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  return (h * 3600 + m * 60) * 1000;
};

const periodLabels = {
  day: 'Diario',
  week: 'Semanal',
  month: 'Mensual',
  all: 'Total',
};

const GoalModal = ({ period, onClose }) => {
  const { tasks } = useTimeTracker();

  return (
    React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" },
      React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm flex flex-col", style:{maxHeight: '90vh'} },
        React.createElement('div', { className: "flex-shrink-0" },
            React.createElement('h2', { className: "text-xl font-bold mb-1" }, "Configurar Objetivos"),
            React.createElement('p', { className: "text-sm text-primary font-semibold mb-4" }, `Período: ${periodLabels[period]}`)
        ),

        React.createElement('div', { className: "flex-grow overflow-y-auto pr-2 -mr-2 space-y-4" },
            tasks.map(task => (
                React.createElement(TaskGoalEditor, { key: task.id, task: task, period: period })
            ))
        ),
        
        React.createElement('div', { className: "flex justify-end pt-4 mt-2 border-t border-gray-700 flex-shrink-0" },
            React.createElement('button', { type: "button", onClick: onClose, className: "bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg" }, "Cerrar")
        )
      )
    )
  );
};

const TaskGoalEditor = ({ task, period }) => {
    const { getGoalByTaskIdAndPeriod, setGoal, deleteGoal } = useTimeTracker();

    const existingGoal = useMemo(() => getGoalByTaskIdAndPeriod(task.id, period), [getGoalByTaskIdAndPeriod, task.id, period]);

    const [type, setType] = useState(existingGoal?.type || 'min');
    const [hours, setHours] = useState(msToInput(existingGoal?.duration || 0).hours);
    const [minutes, setMinutes] = useState(msToInput(existingGoal?.duration || 0).minutes);
    
    useEffect(() => {
        const goal = getGoalByTaskIdAndPeriod(task.id, period);
        setType(goal?.type || 'min');
        const { hours, minutes } = msToInput(goal?.duration || 0);
        setHours(hours);
        setMinutes(minutes);
    }, [period, task.id, getGoalByTaskIdAndPeriod]);


    const handleSave = () => {
        const duration = inputToMs(hours, minutes);
        if (duration > 0) {
            setGoal({ taskId: task.id, period, type, duration });
        } else {
            handleDelete();
        }
    };
    
    const handleDelete = () => {
        deleteGoal(task.id, period);
    }
    
    const handleHourChange = (e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val) && +val >= 0) {
            setHours(val);
        }
    };

    const handleMinuteChange = (e) => {
        const val = e.target.value;
        if (/^\d*$/.test(val) && +val >= 0 && +val < 60) {
            setMinutes(val);
        }
    };
    
    const hasChanged = useMemo(() => {
        const duration = inputToMs(hours, minutes);
        if(!existingGoal && duration === 0) return false;
        if(!existingGoal && duration > 0) return true;
        if(existingGoal && duration === 0) return true;
        return existingGoal?.type !== type || existingGoal?.duration !== duration;
    }, [existingGoal, type, hours, minutes]);

    return (
        React.createElement('div', { className: "bg-gray-800/50 p-3 rounded-lg" },
            React.createElement('p', { className: "font-bold mb-2" }, `${task.icon} ${task.name}`),
            React.createElement('div', { className: "grid grid-cols-3 gap-2 items-center" },
                React.createElement('select', { value: type, onChange: e => setType(e.target.value), className: "col-span-1 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:ring-primary focus:border-primary" },
                    React.createElement('option', { value: "min" }, "Mínimo"),
                    React.createElement('option', { value: "max" }, "Máximo")
                ),
                React.createElement('div', { className: "col-span-2 flex items-center gap-1" },
                    React.createElement('input', { type: "text", value: hours, onChange: handleHourChange, placeholder: "hh", className: "w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-center text-sm" }),
                    React.createElement('span', { className: "font-bold" }, ":"),
                    React.createElement('input', { type: "text", value: minutes, onChange: handleMinuteChange, placeholder: "mm", className: "w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-center text-sm" })
                )
            ),
             React.createElement('div', { className: "flex justify-end items-center mt-2" },
                existingGoal && (
                    React.createElement('button', { onClick: handleDelete, className: "p-1 text-red-500 hover:text-red-400", 'aria-label': "Eliminar objetivo" },
                        React.createElement(TrashIcon, null)
                    )
                ),
                hasChanged && (
                    React.createElement('button', { onClick: handleSave, className: "ml-auto text-sm bg-primary text-bkg font-semibold px-3 py-1 rounded-md hover:bg-purple-500 transition-colors" },
                        "Guardar"
                    )
                )
            )
        )
    )
}

export default GoalModal;