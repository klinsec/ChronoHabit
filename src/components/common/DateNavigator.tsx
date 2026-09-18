import React from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { GoalPeriod } from '@/types';

interface DateNavigatorProps {
    period: GoalPeriod;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    dateRangeDisplay: string;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {
    const { getNow } = useTimeTracker();
    
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
        const now = new Date(getNow());
        now.setHours(23, 59, 59, 999);
        const nextDate = new Date(currentDate);
        if (period === 'day') nextDate.setDate(nextDate.getDate() + 1);
        if (period === 'week') nextDate.setDate(nextDate.getDate() + 7);
        if (period === 'month') nextDate.setMonth(nextDate.getMonth() + 1);
        return nextDate > now;
    };
    
    if (period === 'all') return null;

    return (
        <div className="flex items-center justify-between mb-4 bg-surface p-2 rounded-xl border border-gray-800">
            <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col items-center">
                <span className="font-bold text-lg text-white">{dateRangeDisplay}</span>
                <button onClick={() => setCurrentDate(new Date(getNow()))} className="text-xs text-primary hover:underline transition-colors">Hoy</button>
            </div>
            <button onClick={handleNext} disabled={isNextDisabled()} className="p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};
