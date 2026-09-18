import React from 'react';
import { Reward } from '@/types';
import { GiftIcon, TrashIcon } from '@/components/Icons';

interface RewardCardProps {
    reward: Reward;
    onRedeem: (id: string) => void;
    onDelete: (id: string) => void;
    canAfford: boolean;
}

export const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, onDelete, canAfford }) => {
    const handleRedeemClick = () => {
        if (!canAfford) return;
        if (reward.link) {
            window.open(reward.link, '_blank');
        }
        onRedeem(reward.id);
    };

    return (
        <div className={`relative rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col ${reward.redeemed ? 'bg-gray-800/50 grayscale' : 'bg-surface border border-gray-700 hover:border-primary/50'}`}>
            <div className="h-32 bg-gray-900 w-full relative overflow-hidden group">
                {reward.imageUrl || reward.link ? (
                    reward.imageUrl ? (
                        <img src={reward.imageUrl} alt={reward.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center"><GiftIcon /></div>
                    )
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center"><GiftIcon /></div>
                )}
                
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center"><GiftIcon /></div>

                {reward.redeemed && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                        <div className="border-2 border-red-500 text-red-500 px-4 py-1 font-bold text-lg transform -rotate-12 tracking-widest uppercase rounded">CANJEADO</div>
                    </div>
                )}
                {!reward.redeemed && (
                    <button onClick={() => onDelete(reward.id)} className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full text-white hover:bg-red-500 hover:text-white transition-colors z-10"><TrashIcon /></button>
                )}
            </div>

            <div className="p-3 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-white leading-tight break-words">{reward.title}</h4>
                        {reward.link && (
                            <span className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">🔗 Enlace externo</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        <div className="bg-black/40 px-2 py-1 rounded-md border border-gray-700/50 min-w-[2rem] text-center">
                            <span className="text-xs font-mono font-bold text-yellow-400">{reward.cost}</span>
                        </div>
                        <span className="text-[10px] font-bold text-yellow-600">HC</span>
                    </div>
                </div>
                
                {reward.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{reward.description}</p>}
                
                <div className="mt-auto pt-2">
                    {reward.redeemed ? (
                        <div>
                            {reward.link && (
                                <a href={reward.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-xs text-blue-400 hover:underline mb-1">Abrir Enlace</a>
                            )}
                            <p className="text-[10px] text-gray-500 text-right italic">
                                Canjeado: {reward.redeemedAt ? new Date(reward.redeemedAt).toLocaleDateString() : ''}
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleRedeemClick}
                            disabled={!canAfford}
                            className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                                ${canAfford 
                                    ? 'bg-primary text-bkg hover:bg-purple-400 shadow-md hover:shadow-primary/20' 
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'}`}
                        >
                            {canAfford ? 'Canjear' : 'Insuficiente'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
