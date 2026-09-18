import React from 'react';

export const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    let colorClass = "bg-gray-700 text-gray-300 shadow-sm";
    if (rank === 1) { colorClass = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 shadow-yellow-500/20 shadow-md"; }
    else if (rank === 2) { colorClass = "bg-gray-400/20 text-gray-300 border border-gray-400/50"; }
    else if (rank === 3) { colorClass = "bg-orange-600/20 text-orange-500 border border-orange-500/50"; }

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${colorClass} text-sm transition-all hover:scale-110`}>
            {rank}
        </div>
    );
};
