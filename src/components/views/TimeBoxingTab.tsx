import React, { useState, useEffect } from 'react';
import { Subtask, Task } from '@/types';
import { useTimeTracker } from '@/context/TimeTrackerContext';

// Import touch drag-and-drop polyfill for mobile support
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

// Initialize polyfill to support mobile touch dragging with a delay
// holdToDrag allows the user to scroll horizontally if they swipe quickly.
polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    holdToDrag: 300
});

// Fix for iOS/Chrome mobile to allow preventDefault on touchmove during drag
window.addEventListener('touchmove', function() {}, { passive: false });

interface TimeBoxingTabProps {
    subtasks: Subtask[];
    tasks: Task[];
    onEdit: (subtask: Subtask) => void;
}

const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getWeekDates = (current: Date) => {
    const dates = [];
    const start = new Date(current);
    start.setDate(current.getDate() - 2); // Show 2 days before, 4 days after
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
    }
    return dates;
};

const TimeBoxingTab: React.FC<TimeBoxingTabProps> = ({ subtasks, onEdit }) => {
    const { updateSubtask } = useTimeTracker();
    const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCompleted, setShowCompleted] = useState(false);
    
    const selectedDateStr = formatDate(selectedDate);
    const selectedDayOfWeek = selectedDate.getDay();

    const todayStr = formatDate(new Date());
    const isTodaySelected = selectedDateStr === todayStr;

    const getAssignedDateStr = (s: Subtask): string | null => {
        if (s.timeBox && s.timeBox.date) return s.timeBox.date;
        if (s.deadline) return formatDate(new Date(s.deadline));
        return null;
    };

    // Filter timeboxed tasks for the currently selected date
    const timeboxedTasks = subtasks.filter(s => {
        if (s.completed && !showCompleted) return false;
        if (!s.timeBox) return false;
        if (!s.timeBox.startTime) return false;

        const assignedDateStr = getAssignedDateStr(s);
        const isRepeatingToday = s.timeBox.repeatDays && s.timeBox.repeatDays.includes(selectedDate.getDay());
        const isScheduledForDate = assignedDateStr === selectedDateStr;
        const isLegacyToday = !assignedDateStr && s.timeBox.repeatDays.length === 0 && isTodaySelected;

        return isRepeatingToday || isScheduledForDate || isLegacyToday;
    });

    const unassignedTasks = subtasks.filter(s => {
        if (s.status === 'log') return false;
        if (s.completed && !showCompleted) return false;

        const assignedDateStr = getAssignedDateStr(s);
        const hasTimeBoxTime = !!(s.timeBox && s.timeBox.startTime);

        // If it has a specific date assigned, it ONLY appears on that date
        if (assignedDateStr) {
            if (hasTimeBoxTime) return false;
            return assignedDateStr === selectedDateStr;
        }

        // Global tasks (no specific date)
        if (hasTimeBoxTime) return false;
        if (s.status === 'idea') return false; // Hide global ideas

        return true;
    });

    const [now, setNow] = useState(new Date());
    const [movingTask, setMovingTask] = useState<string | null>(null);
    const [resizingTask, setResizingTask] = useState<string | null>(null);
    const [dragHoverHour, setDragHoverHour] = useState<number | null>(null);
    const [dragHoverDateStr, setDragHoverDateStr] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const handleDragStartMove = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('move', taskId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => setMovingTask(taskId), 0);
    };

    const handleDragStartResize = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('resize', taskId);
        e.dataTransfer.effectAllowed = 'move';
        
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        e.dataTransfer.setDragImage(img, 0, 0);
        
        setTimeout(() => setResizingTask(taskId), 0);
    };

    const handleDropOnDate = (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        setDragHoverDateStr(null);
        setDragHoverHour(null);
        
        const moveId = movingTask || e.dataTransfer.getData('move');
        if (moveId) {
            const task = subtasks.find(s => s.id === moveId);
            if (task && task.timeBox) {
                // Ignore if dropped on the same day it already belongs to
                if (task.timeBox.date === targetDateStr) return;

                // Defer update so dragend can fire properly before unmount
                setTimeout(() => {
                    updateSubtask({
                        ...task,
                        timeBox: task.timeBox ? {
                            ...task.timeBox,
                            date: targetDateStr
                        } : {
                            date: targetDateStr,
                            startTime: '',
                            endTime: '',
                            repeatDays: []
                        }
                    });
                }, 50);
            }
        }
    };

    const handleDrop = (e: React.DragEvent, targetHour: number) => {
        e.preventDefault();
        setDragHoverHour(null);
        
        // Use React state as primary source of truth (mobile polyfill drops dataTransfer)
        const moveId = movingTask || e.dataTransfer.getData('move');
        const resizeId = resizingTask || e.dataTransfer.getData('resize');

        if (moveId) {
            const task = subtasks.find(s => s.id === moveId);
            if (task) {
                const startH = (task.timeBox && task.timeBox.startTime) ? parseInt(task.timeBox.startTime) : targetHour;
                const endH = (task.timeBox && task.timeBox.endTime) ? parseInt(task.timeBox.endTime) : targetHour + 1;
                const duration = isNaN(endH - startH) ? 1 : Math.max(1, endH - startH);
                
                const newStart = `${targetHour.toString().padStart(2, '0')}:00`;
                const newEndHour = Math.min(24, targetHour + duration);
                const newEnd = `${newEndHour.toString().padStart(2, '0')}:00`;
                
                setTimeout(() => {
                    updateSubtask({
                        ...task,
                        timeBox: { startTime: newStart, endTime: newEnd, date: selectedDateStr, repeatDays: task.timeBox?.repeatDays || [] }
                    });
                }, 50);
            }
        } else if (resizeId) {
            const task = subtasks.find(s => s.id === resizeId);
            if (task && task.timeBox) {
                const startH = parseInt(task.timeBox.startTime);
                // End time must be at least startH + 1
                const newEndHour = Math.min(24, Math.max(startH + 1, targetHour + 1));
                const newEnd = `${newEndHour.toString().padStart(2, '0')}:00`;
                
                setTimeout(() => {
                    updateSubtask({
                        ...task,
                        timeBox: { ...task.timeBox, endTime: newEnd }
                    });
                }, 50);
            }
        }
        
        setMovingTask(null);
        setResizingTask(null);
    };

    const handleDragEnd = () => {
        setMovingTask(null);
        setResizingTask(null);
        setDragHoverHour(null);
    };

    const weekDates = getWeekDates(selectedDate);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    return (
        <div className="bg-surface/50 rounded-xl border border-primary/20 mb-20 relative">
            
            {/* Header and Controls */}
            <div className="p-4 border-b border-gray-700 bg-surface/95 backdrop-blur z-30 sticky top-[-1rem] sm:top-[-1rem] shadow-md rounded-t-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-primary">Time Box</h3>
                    <button 
                        onClick={() => setShowCompleted(!showCompleted)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showCompleted ? 'bg-primary/20 border-primary text-primary' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                    >
                        {showCompleted ? 'Ocultar completados' : 'Ver completados'}
                    </button>
                </div>

                {/* Date Navigator */}
                <div className="flex justify-between items-center mb-4 gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {weekDates.map((d, i) => {
                        const dateStr = formatDate(d);
                        const isSelected = dateStr === selectedDateStr;
                        const isToday = dateStr === todayStr;
                        const isHovered = dragHoverDateStr === dateStr;
                        
                        return (
                            <div 
                                key={i}
                                onClick={() => setSelectedDate(d)}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDragEnter={() => setDragHoverDateStr(dateStr)}
                                onDragLeave={() => setDragHoverDateStr(null)}
                                onDrop={(e) => handleDropOnDate(e, dateStr)}
                                className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg cursor-pointer flex-shrink-0 transition-all ${isHovered ? 'bg-primary/50 border border-primary text-white scale-110 shadow-lg' : isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} ${isToday && !isSelected && !isHovered ? 'border border-primary' : ''}`}
                            >
                                <span className="text-[10px] uppercase font-bold">{dayNames[d.getDay()]}</span>
                                <span className="text-lg font-black">{d.getDate()}</span>
                            </div>
                        );
                    })}
                    <button 
                        onClick={() => setSelectedDate(new Date())}
                        className="ml-2 text-xs text-primary font-bold bg-primary/10 px-3 py-2 rounded-lg"
                    >
                        Hoy
                    </button>
                </div>
                
                <h4 className="text-xs font-semibold text-gray-300 mb-2">Tareas sin asignar (Arrastra al horario)</h4>
                <div 
                    className="flex gap-2 overflow-x-auto pb-2 pt-2 px-1 custom-scrollbar min-h-[60px] bg-gray-900/30 rounded-lg border border-dashed border-gray-700 transition-colors"
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const moveId = movingTask || e.dataTransfer.getData('move');
                        if (moveId) {
                            const task = subtasks.find(s => s.id === moveId);
                            if (task && task.timeBox) {
                                const newTask = { ...task };
                                delete newTask.timeBox;
                                setTimeout(() => {
                                    updateSubtask(newTask);
                                }, 50);
                            }
                        }
                    }}
                >
                    {unassignedTasks.length === 0 && (
                        <p className="text-xs text-gray-500 italic flex items-center justify-center w-full">No hay tareas sin asignar.</p>
                    )}
                    {unassignedTasks.map(task => (
                        <div 
                            key={task.id} 
                            onClick={() => onEdit(task)}
                            draggable
                            onDragStart={(e) => handleDragStartMove(e, task.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex-shrink-0 bg-gray-800 border border-gray-500 rounded-lg px-3 py-2 text-xs cursor-move hover:bg-gray-600 hover:border-primary transition-all shadow-sm flex items-center gap-2 max-w-[200px] select-none ${movingTask === task.id ? 'opacity-50' : ''} ${task.completed ? 'opacity-50 line-through' : ''}`}
                            title={task.title}
                        >
                            <span className="truncate">{task.title}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-900 px-1 rounded flex-shrink-0">
                                {task.estimatedPomodoros * 25}m
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Absolute Timeline Grid */}
            <div className="relative border-l border-gray-500 ml-16 mt-4 pb-12" style={{ height: `${18 * 64}px` }}>
                
                {/* Red Line for Current Time (Only visible on Today) */}
                {isTodaySelected && currentHour >= 6 && currentHour <= 23 && (
                    <div 
                        className="absolute w-full z-20 flex items-center pointer-events-none"
                        style={{ 
                            top: `${(currentHour - 6) * 64 + (currentMinute / 60) * 64}px`, 
                            left: '-0.5rem' 
                        }}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                        <div className="h-[2px] bg-red-500/80 w-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                    </div>
                )}

                {/* Grid Rows */}
                {hours.map(hour => {
                    const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
                    const isDragOver = dragHoverHour === hour;
                    
                    return (
                        <div 
                            key={hour} 
                            className={`absolute w-full h-16 border-b border-gray-700/50 transition-colors ${isDragOver ? 'bg-primary/20' : ''}`}
                            style={{ top: `${(hour - 6) * 64}px` }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDragEnter={() => setDragHoverHour(hour)}
                            onDrop={(e) => handleDrop(e, hour)}
                        >
                            <span className="absolute -left-14 -top-2.5 text-sm font-bold bg-surface px-1" style={{ color: '#ffffff' }}>{formattedHour}</span>
                            <div className={`absolute left-0 top-0 w-2 border-t -ml-2 transition-colors ${isDragOver ? 'border-primary' : 'border-gray-500'}`}></div>
                            
                            {/* Empty Drop Zone Visual */}
                            {isDragOver && (
                                <div className="absolute inset-0 ml-4 border-2 border-dashed border-primary/50 rounded-lg mx-2 my-1 pointer-events-none flex items-center justify-center">
                                    <span className="text-xs text-primary font-bold">Soltar en {formattedHour}</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Tasks Layer */}
                {timeboxedTasks.map(task => {
                    const startHour = parseInt(task.timeBox!.startTime);
                    const originalEndHour = parseInt(task.timeBox!.endTime);
                    
                    // Live preview height calculation
                    const endHour = (resizingTask === task.id && dragHoverHour !== null) 
                        ? Math.max(startHour + 1, dragHoverHour + 1)
                        : Math.max(startHour + 1, originalEndHour);

                    const duration = endHour - startHour;
                    
                    // Group overlapping tasks to share width
                    const peers = timeboxedTasks.filter(t => parseInt(t.timeBox!.startTime) === startHour);
                    const index = peers.findIndex(t => t.id === task.id);
                    const width = `calc((100% - 1rem) / ${peers.length})`;
                    const left = `calc(0.5rem + ((100% - 1rem) / ${peers.length}) * ${index})`;
                    
                    const isDraggingAny = movingTask !== null || resizingTask !== null;
                    
                    return (
                        <div 
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStartMove(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onEdit(task)}
                            className={`absolute bg-gray-800 rounded-lg p-2 border-l-4 border-primary shadow-lg cursor-move hover:bg-gray-700 transition-colors flex flex-col group/task overflow-hidden ${(movingTask === task.id || resizingTask === task.id) ? 'opacity-80 z-50' : 'z-10 hover:z-20'} ${task.completed ? 'opacity-50 border-gray-600 bg-gray-900' : ''}`}
                            style={{
                                top: `${(startHour - 6) * 64 + 2}px`,
                                height: `${duration * 64 - 4}px`,
                                left,
                                width,
                                pointerEvents: isDraggingAny ? 'none' : 'auto'
                            }}
                        >
                            <div className="flex justify-between items-center w-full pointer-events-none">
                                <span className={`font-bold text-sm text-gray-100 line-clamp-2 ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
                            </div>
                            <div className="mt-auto pt-1 pointer-events-none">
                                <span className={`text-[10px] font-mono px-1 py-0.5 rounded whitespace-nowrap ${task.completed ? 'text-gray-500 bg-gray-800' : 'text-primary bg-primary/10'}`}>
                                    {task.timeBox!.startTime} - {`${endHour.toString().padStart(2, '0')}:00`}
                                </span>
                            </div>

                            {/* Resize Handle */}
                            <div 
                                className={`absolute bottom-0 left-0 right-0 h-5 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 group-hover/task:opacity-100 bg-gradient-to-t from-primary/30 to-transparent ${isDraggingAny ? 'pointer-events-none' : 'pointer-events-auto'}`}
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); handleDragStartResize(e, task.id); }}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => e.stopPropagation()}
                                title="Arrastra para cambiar la duración"
                            >
                                <div className="w-10 h-1.5 bg-primary rounded-full shadow-sm"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimeBoxingTab;
