import React, { useMemo, useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext';
import { formatDuration, formatDate, formatTime } from '../../utils/helpers';
import { EditIcon, TrashIcon } from '../Icons';
import { TimeEntry } from '../../types';
import EntryModal from '../modals/EntryModal';

const HistoryView: React.FC = () => {
  const { timeEntries, getTaskById, deleteEntry, activeEntry, liveElapsedTime, deleteAllData } = useTimeTracker();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const groupedEntries = useMemo<{[key: string]: TimeEntry[]}>(() => {
    const groups: { [key: string]: TimeEntry[] } = {};
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
    <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-200">Historial</h2>
            <button
                onClick={deleteAllData}
                className="flex items-center space-x-2 text-sm text-red-400 hover:text-red-300 bg-red-900/50 hover:bg-red-900/80 px-3 py-1 rounded-lg transition-colors"
                title="Borrar todos los datos de la aplicación"
            >
                <TrashIcon />
                <span>Borrar todo</span>
            </button>
        </div>
        <div className="space-y-6 pb-4">
        {activeEntry && activeTask && (
            <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-3 sticky top-0 bg-bkg py-2">Ahora</h3>
            <div className="bg-surface p-3 rounded-xl flex items-center justify-between shadow animate-pulse border border-primary/50">
                <div className="flex items-center">
                    <div className="text-2xl mr-4" style={{ filter: 'saturate(0.5)' }}>{activeTask.icon}</div>
                    <div>
                        <p className="font-bold text-on-surface">{activeTask.name}</p>
                        <p className="text-xs text-gray-400">
                            {formatTime(activeEntry.startTime)} - En curso
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <p className="font-mono text-lg text-primary">{formatDuration(liveElapsedTime)}</p>
                </div>
            </div>
            </div>
        )}

        {Object.keys(groupedEntries).length > 0 ? Object.keys(groupedEntries).map(date => (
            <div key={date}>
            <h3 className="text-lg font-semibold text-gray-300 mb-3 sticky top-0 bg-bkg py-2">{date}</h3>
            <div className="space-y-2">
                {groupedEntries[date].map(entry => {
                const task = getTaskById(entry.taskId);
                if (!task) return null;
                const duration = entry.endTime ? entry.endTime - entry.startTime : 0;
                return (
                    <div key={entry.id} className="bg-surface p-3 rounded-xl flex items-center justify-between shadow">
                        <div className="flex items-center">
                            <div className="text-2xl mr-4" style={{ filter: 'saturate(0.5)' }}>{task.icon}</div>
                            <div>
                                <p className="font-bold text-on-surface">{task.name}</p>
                                <p className="text-xs text-gray-400">
                                    {formatTime(entry.startTime)} - {entry.endTime && formatTime(entry.endTime)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <p className="font-mono text-lg text-primary">{formatDuration(duration)}</p>
                            <button onClick={() => setEditingEntry(entry)} className="text-gray-400 hover:text-secondary p-1">
                                <EditIcon />
                            </button>
                            <button onClick={() => deleteEntry(entry.id)} className="text-gray-400 hover:text-red-500 p-1">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                );
                })}
            </div>
            </div>
        )) : (
            !activeEntry && (
            <div className="text-center py-10">
                <p className="text-gray-400">Aún no hay registros completados.</p>
                <p className="text-sm text-gray-500">Registra algunas actividades para ver tu historial aquí.</p>
            </div>
            )
        )}
        {editingEntry && <EntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />}
        </div>
    </div>
  );
};

export default HistoryView;