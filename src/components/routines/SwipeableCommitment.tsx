import React, { useState, useMemo } from 'react';
import { Commitment, ContractHistoryItem, SavedRoutine, CommitmentStatus } from '@/types';
import { CheckCircleIcon, XMarkIcon, ArrowUpIcon, FolderIcon, TrashIcon, PlusIcon, FloppyDiskIcon, RoutineIcon } from '@/components/Icons';

export const SwipeableCommitment: React.FC<{
    commitment: Commitment;
    onChangeStatus: (id: string, status: CommitmentStatus) => void;
}> = ({ commitment, onChangeStatus }) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState(0);
    const minSwipeDistance = 75;

    const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
    
    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart !== null) {
            const diff = e.targetTouches[0].clientX - touchStart;
            setTranslateX(diff);
        }
    }

    const onTouchEnd = () => {
        if (!touchStart) return;
        
        if (translateX > minSwipeDistance) {
            if (commitment.status !== 'failed') onChangeStatus(commitment.id, 'failed');
        } 
        else if (translateX < -minSwipeDistance) {
             onChangeStatus(commitment.id, 'pending');
        }

        setTranslateX(0);
        setTouchStart(null);
    }

    const handleClick = () => {
        if (commitment.status === 'completed') onChangeStatus(commitment.id, 'pending');
        else onChangeStatus(commitment.id, 'completed');
    }

    let bgClass = 'bg-surface border-gray-700 hover:border-gray-500';
    let textClass = 'text-white';
    let icon = null;

    if (commitment.status === 'completed') {
        bgClass = 'bg-green-900/20 border-green-900/50';
        textClass = 'text-green-400 line-through';
        icon = <div className="text-green-500"><CheckCircleIcon /></div>;
    } else if (commitment.status === 'failed') {
        bgClass = 'bg-red-900/20 border-red-900/50 opacity-70';
        textClass = 'text-red-400';
        icon = <div className="text-red-500"><XMarkIcon /></div>;
    } else {
        icon = <div className="w-6 h-6 rounded-full border-2 border-gray-600"></div>;
    }

    return (
        <div className="relative overflow-hidden rounded-xl select-none">
            <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-gray-900 border border-gray-800">
                <div className={`font-bold text-red-500 flex items-center transition-opacity duration-200 ${translateX > 30 ? 'opacity-100' : 'opacity-0'}`}>
                    <XMarkIcon /> <span className="text-xs ml-1 font-bold">FALLADO</span>
                </div>
                <div className={`font-bold text-gray-400 flex items-center transition-opacity duration-200 ${translateX < -30 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-xs mr-1 font-bold">RESETEAR</span> <ArrowUpIcon />
                </div>
            </div>

            <div 
                className={`relative w-full text-left p-4 rounded-xl border transition-transform duration-200 flex items-center justify-between group ${bgClass}`}
                style={{ transform: `translateX(${translateX}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={handleClick}
            >
                <div>
                    <p className={`font-bold ${textClass}`}>{commitment.title}</p>
                    {commitment.time && <p className="text-xs text-gray-500 mt-1">⏰ {commitment.time}</p>}
                </div>
                <div className="flex-shrink-0 ml-2">
                    {icon}
                </div>
            </div>
        </div>
    );
};

