import React, { useMemo, useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { formatDuration, formatDate, formatTime } from '../../utils/helpers.js';
import { EditIcon, TrashIcon } from '../Icons.js';
import EntryModal from '../modals/EntryModal.js';

const HistoryView = () => {
  const { timeEntries, getTaskById, deleteEntry, activeEntry, liveElapsedTime, deleteAllData } = useTimeTracker();
  const [editingEntry, setEditingEntry] = useState(null);

  const groupedEntries = useMemo(() => {
    const groups = {};
    const sortedEntries = [...timeEntries].sort((a, b) => b.startTime - a.startTime);
    
    sortedEntries.forEach(entry => {
      if (entry.endTime) { // Only show completed entries
        const date = formatDate(entry.startTime);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(entry);
      }
    });
    return groups;
  }, [timeEntries]);

  const activeTask = activeEntry ? getTaskById(activeEntry.taskId) : null;

  return (
    React.createElement('div', null,
        React.createElement('div', { className: "flex justify-between items-center mb-4" },
            React.createElement('h2', { className: "text-xl font-semibold text-gray-200" }, "Historial"),
            React.createElement('button',
                {
                    onClick: deleteAllData,
                    className: "flex items-center space-x-2 text-sm text-red-400 hover:text-red-300 bg-red-900/50 hover:bg-red-900/80 px-3 py-1 rounded-lg transition-colors",
                    title: "Borrar todos los datos de la aplicación"
                },
                React.createElement(TrashIcon, null),
                React.createElement('span', null, "Borrar todo")
            )
        ),
        React.createElement('div', { className: "space-y-6 pb-4" },
            activeEntry && activeTask && (
                React.createElement('div', null,
                React.createElement('h3', { className: "text-lg font-semibold text-gray-300 mb-3 sticky top-0 bg-bkg py-2" }, "Ahora"),
                React.createElement('div', { className: "bg-surface p-3 rounded-xl flex items-center justify-between shadow animate-pulse border border-primary/50" },
                    React.createElement('div', { className: "flex items-center" },
                        React.createElement('div', { className: "text-2xl mr-4", style: { filter: 'saturate(0.5)' } }, activeTask.icon),
                        React.createElement('div', null,
                            React.createElement('p', { className: "font-bold text-on-surface" }, activeTask.name),
                            React.createElement('p', { className: "text-xs text-gray-400" },
                                `${formatTime(activeEntry.startTime)} - En curso`
                            )
                        )
                    ),
                    React.createElement('div', { className: "flex items-center space-x-3" },
                        React.createElement('p', { className: "font-mono text-lg text-primary" }, formatDuration(liveElapsedTime))
                    )
                )
                )
            ),

            Object.keys(groupedEntries).length > 0 ? Object.keys(groupedEntries).map(date => (
                React.createElement('div', { key: date },
                React.createElement('h3', { className: "text-lg font-semibold text-gray-300 mb-3 sticky top-0 bg-bkg py-2" }, date),
                React.createElement('div', { className: "space-y-2" },
                    groupedEntries[date].map(entry => {
                    const task = getTaskById(entry.taskId);
                    if (!task) return null;
                    const duration = entry.endTime ? entry.endTime - entry.startTime : 0;
                    return (
                        React.createElement('div', { key: entry.id, className: "bg-surface p-3 rounded-xl flex items-center justify-between shadow" },
                            React.createElement('div', { className: "flex items-center" },
                                React.createElement('div', { className: "text-2xl mr-4", style: { filter: 'saturate(0.5)' } }, task.icon),
                                React.createElement('div', null,
                                    React.createElement('p', { className: "font-bold text-on-surface" }, task.name),
                                    React.createElement('p', { className: "text-xs text-gray-400" },
                                        `${formatTime(entry.startTime)} - ${entry.endTime && formatTime(entry.endTime)}`
                                    )
                                )
                            ),
                            React.createElement('div', { className: "flex items-center space-x-3" },
                                React.createElement('p', { className: "font-mono text-lg text-primary" }, formatDuration(duration)),
                                React.createElement('button', { onClick: () => setEditingEntry(entry), className: "text-gray-400 hover:text-secondary p-1" },
                                    React.createElement(EditIcon, null)
                                ),
                                React.createElement('button', { onClick: () => deleteEntry(entry.id), className: "text-gray-400 hover:text-red-500 p-1" },
                                    React.createElement(TrashIcon, null)
                                )
                            )
                        )
                    );
                    })
                )
                )
            )) : (
                !activeEntry && (
                React.createElement('div', { className: "text-center py-10" },
                    React.createElement('p', { className: "text-gray-400" }, "Aún no hay registros completados."),
                    React.createElement('p', { className: "text-sm text-gray-500" }, "Registra algunas actividades para ver tu historial aquí.")
                )
                )
            ),
            editingEntry && React.createElement(EntryModal, { entry: editingEntry, onClose: () => setEditingEntry(null) })
        )
    )
    );
};

export default HistoryView;