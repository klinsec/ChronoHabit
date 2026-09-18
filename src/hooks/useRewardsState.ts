import { useState, useEffect, useCallback } from 'react';
import { Reward } from '@/types';

export const useRewardsState = () => {
    const [rewards, setRewards] = useState<Reward[]>(() => {
        try {
            const saved = localStorage.getItem('rewards');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error("Error loading rewards:", e);
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('rewards', JSON.stringify(rewards));
    }, [rewards]);

    const addReward = useCallback((rewardData: Omit<Reward, 'id' | 'redeemed' | 'createdAt'>) => {
        const newReward: Reward = {
            id: 'rw_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            ...rewardData,
            redeemed: false,
            createdAt: Date.now()
        };
        setRewards(prev => [...prev, newReward]);
    }, []);

    const removeReward = useCallback((id: string) => {
        setRewards(prev => prev.filter(r => r.id !== id));
    }, []);

    return { rewards, setRewards, addReward, removeReward };
};
