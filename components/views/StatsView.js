
import React from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { StarIcon, ChartIcon } from '../Icons.js';

const StatsView = () => {
    const { firebaseUser, handleLoginRanking, leaderboard, calculateTotalScore, rankingError } = useTimeTracker();

    if (!firebaseUser) {
        return (
            React.createElement('div', { className: "flex flex-col items-center justify-center h-full p-8 space-y-6 text-center animate-in fade-in" },
                React.createElement('div', { className: "p-4 bg-primary/10 rounded-full text-primary" },
                    React.createElement('div', { className: "transform scale-150" }, React.createElement(StarIcon, null))
                ),
                React.createElement('h2', { className: "text-xl font-bold text-white" }, "Ranking Global"),
                React.createElement('p', { className: "text-gray-400 text-sm max-w-xs" }, 
                    "Inicia sesión con Google para guardar tu puntuación y competir en la tabla de clasificación."
                ),
                React.createElement('button', 
                    { 
                        onClick: async () => {
                            try {
                                await handleLoginRanking();
                            } catch (e) {
                                alert("Error al iniciar sesión: " + (e.message || "Desconocido"));
                            }
                        },
                        className: "bg-white text-black font-bold py-3 px-6 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg"
                    },
                    React.createElement('img', { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", className: "w-5 h-5", alt: "Google" }),
                    "Iniciar con Google"
                )
            )
        );
    }

    const myScore = calculateTotalScore();

    return React.createElement('div', { className: "h-full flex flex-col p-2 space-y-4" },
        // Header Stats
        React.createElement('div', { className: "bg-surface p-4 rounded-2xl shadow-lg border border-primary/20 flex items-center justify-between" },
            React.createElement('div', null,
                React.createElement('p', { className: "text-xs text-gray-400 uppercase tracking-widest" }, "Tu Puntuación"),
                React.createElement('h2', { className: "text-3xl font-bold text-primary" }, myScore)
            ),
            React.createElement('div', { className: "p-3 bg-primary/10 rounded-full text-primary" },
                React.createElement(ChartIcon, null)
            )
        ),

        // Ranking List
        React.createElement('div', { className: "flex-grow bg-surface rounded-2xl p-4 shadow-lg border border-gray-800 overflow-hidden flex flex-col" },
            React.createElement('h3', { className: "text-lg font-bold mb-4 flex items-center gap-2" },
                React.createElement(StarIcon, null),
                " Tabla de Líderes"
            ),
            
            rankingError ? (
                React.createElement('div', { className: "text-red-400 text-center text-sm p-4 bg-red-900/10 rounded" },
                    `Error cargando ranking: ${rankingError}`
                )
            ) : (
                React.createElement('div', { className: "overflow-y-auto space-y-2 pr-1" },
                    leaderboard.length === 0 ? (
                        React.createElement('p', { className: "text-center text-gray-500 py-4" }, "Cargando clasificación...")
                    ) : (
                        leaderboard.map((user, index) => {
                            const isMe = user.id === firebaseUser.uid;
                            return React.createElement('div', 
                                {
                                    key: user.id,
                                    className: `flex items-center p-3 rounded-xl transition-colors ${isMe ? 'bg-primary/20 border border-primary/50' : 'bg-gray-800/50 border border-transparent'}`
                                },
                                React.createElement('div', 
                                    {
                                        className: `w-8 h-8 flex items-center justify-center font-bold rounded-full mr-3 ${index < 3 ? 'text-black' : 'text-gray-400 bg-gray-700'}`,
                                        style: { backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : undefined }
                                    },
                                    index + 1
                                ),
                                React.createElement('div', { className: "flex-grow flex items-center gap-2" },
                                    user.photo && React.createElement('img', { src: user.photo, className: "w-6 h-6 rounded-full", alt: "" }),
                                    React.createElement('span', { className: `text-sm ${isMe ? 'font-bold text-white' : 'text-gray-300'}` },
                                        `${user.username} ${isMe ? '(Tú)' : ''}`
                                    )
                                ),
                                React.createElement('div', { className: "font-mono font-bold text-primary" },
                                    user.points
                                )
                            );
                        })
                    )
                )
            )
        )
    );
};

export default StatsView;
