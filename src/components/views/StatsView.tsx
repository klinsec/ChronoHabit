import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTimeTracker } from '@/context/TimeTrackerContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, LabelList, CartesianGrid } from 'recharts';
import { formatDuration } from '@/utils/helpers';
import { CogIcon, EditIcon, StarIcon, PlusIcon, TrashIcon, CopyIcon, UsersIcon, GiftIcon, CoinIcon, MailIcon, CheckCircleIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';
import GoalModal from '@/components/modals/GoalModal';
import { GoalPeriod, Reward } from '@/types';

interface DateNavigatorProps {
    period: GoalPeriod;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    dateRangeDisplay: string;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ period, currentDate, setCurrentDate, dateRangeDisplay }) => {
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
        <div className="flex items-center justify-between mb-4 bg-surface p-2 rounded-xl">
            <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col items-center">
                <span className="font-bold text-lg text-on-surface">{dateRangeDisplay}</span>
                <button onClick={() => setCurrentDate(new Date(getNow()))} className="text-xs text-secondary hover:underline">Hoy</button>
            </div>
            <button onClick={handleNext} disabled={isNextDisabled()} className="p-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
    );
};

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    let colorClass = "bg-gray-700 text-gray-300";
    if (rank === 1) { colorClass = "bg-yellow-500/20 text-yellow-500"; }
    else if (rank === 2) { colorClass = "bg-gray-400/20 text-gray-300"; }
    else if (rank === 3) { colorClass = "bg-orange-600/20 text-orange-500"; }

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${colorClass} text-sm`}>
            {rank}
        </div>
    );
};

const RankingTable = ({ data, localUser, title, icon, showFooterSelf = false, onRemoveItem, onAddFriend, friendsList = [], filterZero = false, limit }: any) => {
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

const RankingView = () => {
    const { 
        firebaseUser, handleLoginRanking, handleLogoutRanking, 
        leaderboard, calculateMonthlyScore,
        rankingMonth, setRankingMonth,
        rankingError, friendsList, friendRequests,
        sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend
    } = useTimeTracker();
    
    const [friendInput, setFriendInput] = useState('');
    const [showInbox, setShowInbox] = useState(false);

    const handleAddFriend = () => {
        if (friendInput.trim()) {
            sendFriendRequest(friendInput.trim());
            setFriendInput('');
            alert("Solicitud enviada!");
        }
    };

    const handleAddFromRanking = (userId: string) => {
        sendFriendRequest(userId);
        alert("Solicitud enviada!");
    };

    const copyUserId = () => {
        if (firebaseUser) {
            navigator.clipboard.writeText(firebaseUser.uid).then(() => {
                alert("ID copiado: " + firebaseUser.uid);
            });
        }
    };

    const myScore = calculateMonthlyScore(rankingMonth);

    const formatMonth = (monthKey: string) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const handlePrevMonth = () => {
        const [year, month] = rankingMonth.split('-').map(Number);
        const date = new Date(year, month - 2);
        setRankingMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };

    const handleNextMonth = () => {
        const [year, month] = rankingMonth.split('-').map(Number);
        const date = new Date(year, month);
        setRankingMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    };
    
    if (!firebaseUser) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center animate-in fade-in">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                    <div className="transform scale-150"><StarIcon /></div>
                </div>
                <h2 className="text-2xl font-bold text-white">Ranking Global</h2>
                <p className="text-gray-400 text-sm max-w-xs">
                    Inicia sesión con Google para guardar tu puntuación y competir en la tabla de clasificación.
                </p>
                <button 
                    onClick={handleLoginRanking}
                    className="bg-white text-black font-bold py-3 px-6 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Iniciar con Google
                </button>
            </div>
        );
    }

    const localUserObj = {
        id: firebaseUser.uid,
        username: firebaseUser.displayName || 'Yo',
        photo: firebaseUser.photoURL,
        points: myScore
    };

    const friendsData = (leaderboard || []).filter((u: any) => friendsList.includes(u.id));
    const globalData = leaderboard || []; 

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {rankingError && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg text-xs break-words">
                    <p className="font-bold mb-1">⚠️ Error de Conexión</p>
                    <p className="font-mono bg-black/20 p-1 rounded mb-2">{String(rankingError)}</p>
                </div>
            )}

            <div className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-gray-700 mb-4">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400">
                    <ChevronLeftIcon />
                </button>
                <div className="text-center">
                    <p className="text-[10px] text-primary uppercase tracking-widest font-bold">RANKING MENSUAL</p>
                    <p className="text-sm font-bold text-white capitalize">{formatMonth(rankingMonth)}</p>
                </div>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400">
                    <ChevronRightIcon />
                </button>
            </div>

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-2xl border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {localUserObj.photo ? (
                                <img src={localUserObj.photo} className="w-10 h-10 rounded-full border-2 border-primary" alt="" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-bold text-lg">
                                    {localUserObj.username[0]?.toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white">{localUserObj.username}</h2>
                                <p className="text-[10px] text-green-400">● Online</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div onClick={copyUserId} className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer hover:text-primary transition-colors bg-black/20 w-fit px-2 py-1 rounded">
                                <span>Copiar ID</span>
                                <CopyIcon />
                            </div>
                            <button 
                                onClick={() => setShowInbox(!showInbox)}
                                className={`flex items-center gap-1 text-xs cursor-pointer transition-colors bg-black/20 w-fit px-2 py-1 rounded relative ${friendRequests.length > 0 ? 'text-yellow-500' : 'text-gray-500'}`}
                            >
                                <MailIcon />
                                <span>Bandeja</span>
                                {friendRequests.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                                        {friendRequests.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">PUNTUACIÓN</p>
                        <p className="text-2xl font-mono font-bold text-primary">{myScore.toLocaleString()}</p>
                    </div>
                </div>
                <button onClick={handleLogoutRanking} className="text-xs text-red-400 hover:text-red-300 mt-2 underline">Cerrar sesión</button>
            </div>

            {showInbox && (
                <div className="bg-surface p-4 rounded-2xl border border-yellow-500/30 animate-in slide-in-from-top-2">
                    <h3 className="text-sm font-bold text-yellow-500 mb-3 flex items-center gap-2">
                        <MailIcon /> Solicitudes de Amistad
                    </h3>
                    {friendRequests.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No tienes solicitudes pendientes.</p>
                    ) : (
                        <div className="space-y-3">
                            {friendRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        {req.fromPhoto ? (
                                            <img src={req.fromPhoto} className="w-8 h-8 rounded-full" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                                                {req.fromName[0]}
                                            </div>
                                        )}
                                        <span className="text-sm text-white font-medium">{req.fromName}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => acceptFriendRequest(req.id, req.fromName, req.fromPhoto)}
                                            className="p-1.5 bg-green-500/20 text-green-500 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                                        >
                                            <CheckCircleIcon />
                                        </button>
                                        <button 
                                            onClick={() => rejectFriendRequest(req.id)}
                                            className="p-1.5 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <XMarkIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={friendInput}
                        onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="Añadir amigo por ID..."
                        className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-primary focus:border-primary placeholder-gray-500"
                    />
                    <button onClick={handleAddFriend} className="bg-gray-700 hover:bg-primary hover:text-bkg text-white px-3 rounded-lg transition-colors">
                        <PlusIcon />
                    </button>
                </div>
                <RankingTable 
                    title="Amigos" 
                    icon={<UsersIcon />}
                    data={friendsData} 
                    localUser={localUserObj}
                    onRemoveItem={removeFriend}
                    friendsList={friendsList}
                    filterZero={false}
                />
            </div>

            <RankingTable 
                title="Top Global" 
                icon={<StarIcon />}
                data={globalData} 
                localUser={localUserObj}
                onAddFriend={handleAddFromRanking}
                friendsList={friendsList}
                showFooterSelf={true}
                filterZero={false} 
                limit={10}
            />
        </div>
    );
};

const AddRewardModal = ({ onClose }: { onClose: () => void }) => {
    const { addReward } = useTimeTracker();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState(10);
    const [productLink, setProductLink] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageInputUrl, setImageInputUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || cost <= 0) return;
        
        let finalImage = imageUrl;
        if (!finalImage && imageInputUrl.trim()) {
            finalImage = imageInputUrl.trim();
        }

        addReward({ 
            title, 
            description, 
            cost, 
            imageUrl: finalImage,
            link: productLink.trim()
        });
        onClose();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 400; 
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setImageUrl(dataUrl);
                    setImageInputUrl('');
                };
                img.src = readerEvent.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Nueva Recompensa</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Título</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" required placeholder="Ej: Cena Sushi, Móvil, Zapatillas..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Descripción (Opcional)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Enlace del Premio (Opcional)</label>
                        <input type="url" value={productLink} onChange={e => setProductLink(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs" placeholder="https://amazon.es/..." />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Coste (HC)</label>
                        <div className="flex items-center gap-2">
                            <div className="text-yellow-500"><CoinIcon /></div>
                            <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} className="flex-grow bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white" min={1} required />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Imagen</label>
                        {imageUrl ? (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-600 group mb-3">
                                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setImageUrl('')} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors">
                                    <TrashIcon />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 text-xs">
                                    <PlusIcon />
                                    <span>📁 Subir foto de galería</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="h-px bg-gray-700 flex-grow"></div>
                                    <span className="text-xs text-gray-500">O</span>
                                    <div className="h-px bg-gray-700 flex-grow"></div>
                                </div>
                                <input type="url" placeholder="🔗 Pegar URL de imagen..." value={imageInputUrl} onChange={(e) => setImageInputUrl(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs" />
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-bold">Cancelar</button>
                        <button type="submit" className="flex-1 bg-primary text-bkg py-2 rounded-lg font-bold">Crear</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface RewardCardProps {
    reward: Reward;
    onRedeem: (id: string) => void;
    onDelete: (id: string) => void;
    canAfford: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onRedeem, onDelete, canAfford }) => {
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

const RewardsView = () => {
    const { walletPoints, rewards, redeemReward, deleteReward } = useTimeTracker();
    const [showAddModal, setShowAddModal] = useState(false);

    const sortedRewards = useMemo(() => {
        return [...rewards].sort((a, b) => {
            if (a.redeemed && !b.redeemed) return 1;
            if (!a.redeemed && b.redeemed) return -1;
            return b.createdAt - a.createdAt; 
        });
    }, [rewards]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-2xl shadow-xl text-center relative overflow-hidden border border-purple-500/30">
                <div className="relative z-10">
                    <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">HisunaCoins</p>
                    <div className="flex items-center justify-center gap-2">
                        <div className="text-yellow-400 transform scale-150"><CoinIcon /></div>
                        <h2 className="text-4xl font-mono font-bold text-white drop-shadow-md">{Math.floor(walletPoints)} <span className="text-sm font-sans text-purple-300">HC</span></h2>
                    </div>
                    <p className="text-[10px] text-purple-200/80 mt-2">Saldo disponible para canjear</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-xl transform -translate-x-5 translate-y-5"></div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <GiftIcon /> Catálogo
                </h3>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-2 border border-gray-600 transition-colors"
                >
                    <PlusIcon /> Crear Recompensa
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-20">
                {sortedRewards.length === 0 ? (
                    <div className="col-span-2 text-center py-10 text-gray-500 bg-surface/30 rounded-xl border border-dashed border-gray-700">
                        <p className="mb-2">📭</p>
                        <p className="text-sm">Aún no has creado recompensas.</p>
                        <p className="text-xs">¡Define premios para motivarte!</p>
                    </div>
                ) : (
                    sortedRewards.map(r => (
                        <RewardCard key={r.id} reward={r} onRedeem={redeemReward} onDelete={deleteReward} canAfford={walletPoints >= r.cost} />
                    ))
                )}
            </div>

            {showAddModal && <AddRewardModal onClose={() => setShowAddModal(false)} />}
        </div>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const { name, value, goal } = data;
      return (
        <div className="bg-surface p-2 border border-gray-700 rounded-md shadow-lg text-sm">
          <p className="font-bold text-base">{name}</p>
          <p>Progreso: {formatDuration(value)}</p>
          {goal && <p>Objetivo: {formatDuration(goal.duration)} ({goal.type === 'min' ? 'mínimo' : 'máximo'})</p>}
        </div>
      );
    }
    return null;
};

const UnifiedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
        return (
          <div className="bg-surface p-3 border border-gray-700 rounded-xl shadow-lg text-sm">
              <p className="font-bold text-base text-white mb-2 border-b border-gray-700 pb-1">{label}</p>
              {payload.map((entry: any) => (
                  <div key={entry.name} className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-gray-300 capitalize">{entry.name}:</span>
                      <span className="font-bold text-white">{parseFloat(entry.value.toFixed(1))} pts</span>
                  </div>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between">
                  <span className="font-bold text-gray-400">Total:</span>
                  <span className="font-bold text-white text-lg">{parseFloat(total.toFixed(1))}</span>
              </div>
          </div>
        );
    }
    return null;
};

const renderProgressLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
    const formattedValue = formatDuration(value);
    return (
        <text x={x + width + 5} y={y + 10} fill="#e0e0e0" textAnchor="start" dominantBaseline="middle" className="text-xs font-mono">
            {formattedValue}
        </text>
    );
};

const renderGoalLabel = (props: any) => {
    const { x, y, width, goal } = props;
    if (!goal || goal.duration === 0) return null;
    const formattedValue = formatDuration(goal.duration);
    return (
         <text x={x + width + 5} y={y + 18} fill="#a0a0a0" textAnchor="start" dominantBaseline="middle" className="text-xs font-mono">
            {formattedValue}
        </text>
    );
};

const StatsView: React.FC = () => {
  const { timeEntries, getTaskById, activeEntry, liveElapsedTime, getGoalByTaskIdAndPeriod, subtasks, contract, pastContracts, getNow } = useTimeTracker();
  const [activeTab, setActiveTab] = useState<'charts' | 'ranking' | 'rewards'>('charts');
  const [period, setPeriod] = useState<GoalPeriod>('week');
  const [currentDate, setCurrentDate] = useState(new Date(getNow()));
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  
  // Auto-update currentDate when period changes
  useEffect(() => {
      setCurrentDate(new Date(getNow()));
  }, [period, getNow]);

  const periodLabels: Record<GoalPeriod, string> = {
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    all: 'Año',
  };

  const dateRange = useMemo(() => {
    const now = new Date(getNow());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    let start: Date, end: Date, display: string;
    
    switch (period) {
      case 'day':
        start = new Date(targetDate); start.setHours(0, 0, 0, 0);
        end = new Date(targetDate); end.setHours(23, 59, 59, 999);
        display = start.getTime() === today.getTime() ? 'Hoy' : start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
        break;
      case 'week': {
        const startOfWeek = new Date(targetDate);
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        start = new Date(startOfWeek);
        end = new Date(startOfWeek); 
        end.setDate(startOfWeek.getDate() + 6); 
        end.setHours(23, 59, 59, 999);
        
        const todayWeekStart = new Date(today);
        const tDay = todayWeekStart.getDay();
        todayWeekStart.setDate(todayWeekStart.getDate() - tDay + (tDay === 0 ? -6 : 1));
        todayWeekStart.setHours(0,0,0,0);
        
        display = start.getTime() === todayWeekStart.getTime() ? "Esta Semana" : `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
        break;
      }
      case 'month':
        start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
        display = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        break;
      case 'all': default:
        start = new Date(targetDate.getFullYear(), 0, 1);
        end = new Date(targetDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        display = `${targetDate.getFullYear()}`;
    }
    return { start: start.getTime(), end: end.getTime(), display };
  }, [period, currentDate]);

  const filteredEntries = useMemo(() => timeEntries.filter(e => e.endTime && e.startTime >= dateRange.start && e.startTime <= dateRange.end), [timeEntries, dateRange]);
  
  const taskDurations = useMemo(() => {
      const d: any = {};
      filteredEntries.forEach(e => { if(e.endTime) d[e.taskId] = (d[e.taskId]||0) + (e.endTime - e.startTime); });
      if(activeEntry && getNow() >= dateRange.start && getNow() <= dateRange.end) {
          d[activeEntry.taskId] = (d[activeEntry.taskId]||0) + (getNow() - Math.max(activeEntry.startTime, dateRange.start));
      }
      return d;
  }, [filteredEntries, activeEntry, liveElapsedTime, dateRange, getNow]);
  
  const chartData = useMemo(() => Object.entries(taskDurations)
      .map(([id, val]) => {
          const task = getTaskById(id);
          return { name: task?.name || 'Desconocida', value: val, fill: task?.color || '#ccc', icon: task?.icon, goal: getGoalByTaskIdAndPeriod(id, period) };
      })
      .filter((i:any) => Number(i.value) > 0 || (i.goal && i.goal.duration > 0))
      .sort((a:any, b:any) => Number(b.value) - Number(a.value)), 
  [taskDurations, getTaskById, getGoalByTaskIdAndPeriod, period]);

  const unifiedPointsData = useMemo(() => {
      const bucketType = (period === 'week' || period === 'month') ? 'day' : 'month';
      const dataMap = new Map();
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const getDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const getMonthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      let cursor = new Date(startDate);
      
      while (cursor <= endDate) {
          let key = bucketType === 'day' ? getDateKey(cursor) : getMonthKey(cursor);
          dataMap.set(key, { timer: 0, tasks: 0, routine: 0 });
          if (bucketType === 'day') cursor.setDate(cursor.getDate() + 1);
          else cursor.setMonth(cursor.getMonth() + 1);
      }
      
      // Timer Points (Completados)
      filteredEntries.forEach(entry => {
          if (!entry.endTime) return;
          const task = getTaskById(entry.taskId);
          const satisfaction = task?.satisfaction ?? 5;
          const clampedSat = Math.max(1, Math.min(10, satisfaction));
          const multiplier = (10 - clampedSat) / 9;

          const entryDate = new Date(entry.startTime);
          let key = bucketType === 'day' ? getDateKey(entryDate) : getMonthKey(entryDate);
          if (dataMap.has(key)) {
              const current = dataMap.get(key);
              current.timer += ((entry.endTime - entry.startTime) / (1000 * 60 * 60)) * multiplier;
          }
      });

      // Timer Points (Tiempo activo actual)
      if (activeEntry) {
          const now = getNow();
          if (now >= dateRange.start && now <= dateRange.end) {
              const task = getTaskById(activeEntry.taskId);
              const satisfaction = task?.satisfaction ?? 5;
              const clampedSat = Math.max(1, Math.min(10, satisfaction));
              const multiplier = (10 - clampedSat) / 9;

              const entryDate = new Date(Math.max(activeEntry.startTime, dateRange.start));
              let key = bucketType === 'day' ? getDateKey(entryDate) : getMonthKey(entryDate);
              if (dataMap.has(key)) {
                  const current = dataMap.get(key);
                  const elapsedMs = now - Math.max(activeEntry.startTime, dateRange.start);
                  current.timer += (elapsedMs / (1000 * 60 * 60)) * multiplier;
              }
          }
      }

      // Task Points
      subtasks.forEach(subtask => {
          if (subtask.completed && subtask.completedAt) {
              if (subtask.completedAt >= dateRange.start && subtask.completedAt <= dateRange.end) {
                  const points = subtask.difficulty || 0;
                  const completedDate = new Date(subtask.completedAt);
                  let key = bucketType === 'day' ? getDateKey(completedDate) : getMonthKey(completedDate);
                  if (dataMap.has(key)) {
                      const current = dataMap.get(key);
                      current.tasks += points;
                  }
              }
          }
      });

      // Routine Points
      const allDailyHistory = [
          ...(contract?.dailyHistory || []),
          ...pastContracts.flatMap(c => c.dailyHistory || [])
      ];

      allDailyHistory.forEach(dayHistory => {
          const historyDate = new Date(dayHistory.date + 'T12:00:00'); // Evita saltos de Timezone
          if (historyDate.getTime() >= dateRange.start && historyDate.getTime() <= dateRange.end) {
              let key = dayHistory.date;
              if (bucketType === 'month') {
                  key = `${historyDate.getFullYear()}-${pad(historyDate.getMonth() + 1)}`;
              }
              if (dataMap.has(key)) {
                  const current = dataMap.get(key);
                  current.routine += dayHistory.points;
              }
          }
      });

      return Array.from(dataMap.entries()).map(([dateKey, values]: any) => {
          const [year, month, day] = dateKey.split('-').map(Number);
          let label = bucketType === 'day' 
            ? new Date(year, month - 1, day || 1).toLocaleDateString('es-ES', { weekday: 'narrow', day: 'numeric' }) 
            : new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'short' });
          return { date: label, ...values, total: values.timer + values.tasks + values.routine };
      });
  }, [filteredEntries, subtasks, contract, pastContracts, period, dateRange, activeEntry, liveElapsedTime, getNow, getTaskById]); 

  return (
    <div className="space-y-6">
      {isGoalModalOpen && <GoalModal period={period} onClose={() => setIsGoalModalOpen(false)} />}
      
      <div className="flex bg-gray-800 p-1 rounded-xl mb-4">
          <button onClick={() => setActiveTab('charts')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'charts' ? 'bg-surface text-primary shadow-md' : 'text-gray-400 hover:text-white'}`}>Gráficas</button>
          <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-surface text-yellow-500 shadow-md' : 'text-gray-400 hover:text-white'}`}>Ranking 🏆</button>
          <button onClick={() => setActiveTab('rewards')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'rewards' ? 'bg-surface text-green-400 shadow-md' : 'text-gray-400 hover:text-white'}`}>Recompensas</button>
      </div>

      {activeTab === 'ranking' && <RankingView />}
      {activeTab === 'rewards' && <RewardsView />}
      
      {activeTab === 'charts' && (
          <div>
             <div className="flex justify-center bg-gray-800 p-1 rounded-xl mb-4">
                {(['day', 'week', 'month', 'all'] as GoalPeriod[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${period === p ? 'bg-primary text-bkg' : 'text-gray-300'}`}>
                        {periodLabels[p]}
                    </button>
                ))}
             </div>
             
             <DateNavigator period={period} currentDate={currentDate} setCurrentDate={setCurrentDate} dateRangeDisplay={dateRange.display} />

             {chartData.length > 0 || unifiedPointsData.some((d: any) => d.total > 0) ? (
                <div className="space-y-10">
                    {period !== 'day' && (
                        <div className="bg-surface/30 p-4 rounded-xl border border-gray-800">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-center text-white">Puntos Totales (Diario)</h3>
                            </div>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={unifiedPointsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                        <XAxis 
                                            dataKey="date" 
                                            tick={{ fill: '#888', fontSize: 10 }} 
                                            axisLine={false} 
                                            tickLine={false}
                                            interval={period === 'month' ? 2 : 0}
                                        />
                                        <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<UnifiedTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                                        <Bar dataKey="timer" name="Cronómetro" stackId="a" fill="#bb86fc" radius={[0,0,4,4]} barSize={20} isAnimationActive={false} />
                                        <Bar dataKey="tasks" name="Tareas" stackId="a" fill="#eab308" barSize={20} isAnimationActive={false} />
                                        <Bar dataKey="routine" name="Rutina" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} barSize={20} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-center">Distribución del Tiempo</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <Pie data={chartData} cx="50%" cy="50%" nameKey="name" dataKey="value" innerRadius="60%" outerRadius="80%" paddingAngle={5} labelLine={false} isAnimationActive={false}>
                                        {chartData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                     <div>
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-xl font-semibold text-center">Desglose por Tarea</h3>
                        <button onClick={() => setIsGoalModalOpen(true)} className="text-gray-400 hover:text-white transition-colors">
                            <CogIcon />
                        </button>
                      </div>
                      <div style={{ width: '100%', height: Math.max(chartData.length * 60 + 20, 100), marginTop: '1rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 60, left: 5, bottom: 5 }} barCategoryGap="35%">
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} tick={{ fill: '#e0e0e0', fontSize: 14 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                            <Bar dataKey="value" barSize={12} radius={[2, 2, 2, 2]} isAnimationActive={false}>
                              {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-progress-${index}`} fill={entry.fill} />
                              ))}
                               <LabelList dataKey="value" content={renderProgressLabel} />
                            </Bar>
                            <Bar dataKey={(data: any) => data.goal?.duration || 0} barSize={24} radius={[4, 4, 4, 4]} isAnimationActive={false}>
                                {chartData.map((entry: any, index: number) => {
                                    const { value, goal } = entry;
                                    let color = "transparent";
                                    if (goal && goal.duration > 0) {
                                        if (goal.type === 'min') {
                                            color = value >= goal.duration ? '#22c55e' : '#4b5563';
                                        } else { // max
                                            color = value > goal.duration ? '#ef4444' : '#22c55e';
                                        }
                                    }
                                    return <Cell key={`cell-goal-${index}`} fill={color} />;
                                })}
                                <LabelList dataKey="goal.duration" content={renderGoalLabel} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                </div>
             ) : (
                <div className="text-center py-10">
                    <p className="text-gray-400">No hay datos para este período.</p>
                </div>
             )}
          </div>
      )}
    </div>
  );
};

export default StatsView;