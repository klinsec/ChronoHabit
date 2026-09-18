import React from 'react';
import { RankBadge } from './RankBadge';
import { TrashIcon, PlusIcon, CheckCircleIcon } from '@/components/Icons';

export const RankingTable = ({ data, localUser, title, icon, showFooterSelf = false, onRemoveItem, onAddFriend, friendsList = [], filterZero = false, limit }: any) => {
    let activeUsers = data ? [...data] : [];

    if (localUser) {
        const exists = activeUsers.find(u => u.id === localUser.id);
        if (!exists) {
            activeUsers.push(localUser);
        } else {
            activeUsers = activeUsers.map(u => u.id === localUser.id ? { ...u, points: localUser.points, username: localUser.username, photo: localUser.photo } : u);
        }
    }

    if (filterZero) {
        activeUsers = activeUsers.filter(u => u.points > 0 || (localUser && u.id === localUser.id));
    }

    activeUsers.sort((a, b) => b.points - a.points);
    
    const currentUserId = localUser?.id;
    const selfIndex = activeUsers.findIndex(u => u.id === currentUserId);
    const selfData = selfIndex >= 0 ? { ...activeUsers[selfIndex], rank: selfIndex + 1 } : null;
    
    const displayUsers = limit ? activeUsers.slice(0, limit) : activeUsers;
    const isSelfInTop = selfIndex >= 0 && (limit ? selfIndex < limit : true);

    return (
        <div className="bg-surface rounded-2xl overflow-hidden border border-gray-800 shadow-lg mb-6">
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-900">
                        <tr>
                            <th className="px-4 py-3 w-16">Pos</th>
                            <th className="px-4 py-3">Usuario</th>
                            <th className="px-4 py-3 text-right">Puntos</th>
                            {(onRemoveItem || onAddFriend) && <th className="px-2 py-3 w-8"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayUsers.length === 0 ? (
                            <tr>
                                <td colSpan={(onRemoveItem || onAddFriend) ? 4 : 3} className="px-4 py-6 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <span>😴 Sin datos aún</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            displayUsers.map((user, index) => {
                                const isFriend = friendsList.includes(user.id);
                                const isSelf = user.id === currentUserId;

                                return (
                                    <tr 
                                        key={user.id || index} 
                                        className={`border-b border-gray-800 transition-colors ${isSelf ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-gray-800/50'}`}
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <RankBadge rank={index + 1} />
                                        </td>
                                        <td className={`px-4 py-3 ${isSelf ? 'font-bold text-primary' : 'text-gray-300'}`}>
                                            <div className="flex items-center gap-2">
                                                {user.photo ? (
                                                    <img src={user.photo} alt="Avatar" className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {user.username?.[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span>{user.username || 'Anónimo'}</span>
                                                    {isSelf && <span className="text-[10px] text-gray-500">(Tú)</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-white">
                                            {Math.floor(user.points || 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {onRemoveItem && !isSelf && (
                                                    <button onClick={() => onRemoveItem(user.id)} className="text-gray-600 hover:text-red-500 transition-colors" title="Eliminar amigo">
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                                {onAddFriend && !isSelf && !isFriend && (
                                                    <button onClick={() => onAddFriend(user.id)} className="text-gray-600 hover:text-primary transition-colors" title="Enviar solicitud de amistad">
                                                        <PlusIcon />
                                                    </button>
                                                )}
                                                {isFriend && !isSelf && !onRemoveItem && (
                                                    <span className="text-primary" title="Ya es tu amigo">
                                                        <CheckCircleIcon />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {limit && activeUsers.length > limit && (
                 <div className="px-4 py-2 bg-gray-900/30 text-center text-xs text-gray-500 font-mono tracking-widest">...</div>
            )}
            {showFooterSelf && !isSelfInTop && selfData && (
                <div className="border-t border-gray-700 bg-gray-800 p-3 flex justify-between items-center animate-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs uppercase">Tu Posición:</span>
                        <RankBadge rank={selfData.rank} />
                    </div>
                    <span className="font-mono font-bold text-primary">{Math.floor(selfData.points).toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};
