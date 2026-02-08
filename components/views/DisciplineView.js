
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { ContractIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '../Icons.js';

const DisciplineView = () => {
  const { contract, startContract, toggleCommitment, advancePhase, resetContract } = useTimeTracker();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  
  const [newCommitments, setNewCommitments] = useState([
      { title: '', time: '' }
  ]);

  if (!contract) {
      if (isSetupOpen) {
          return React.createElement(ContractSetup, {
              commitments: newCommitments,
              setCommitments: setNewCommitments,
              onCancel: () => setIsSetupOpen(false),
              onStart: () => {
                  startContract(newCommitments.filter(c => c.title.trim() !== ''));
                  setIsSetupOpen(false);
              }
          });
      }
      return React.createElement(Onboarding, { onStart: () => setIsSetupOpen(true) });
  }

  return React.createElement(ActiveContractView, {
      contract: contract,
      onToggle: toggleCommitment,
      onAdvance: advancePhase,
      onReset: resetContract
  });
};

const Onboarding = ({ onStart }) => (
    React.createElement('div', { className: "flex flex-col h-full items-center justify-center p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300" },
        React.createElement('div', { className: "p-4 bg-primary/10 rounded-full text-primary" },
            React.createElement('div', { className: "transform scale-150" }, React.createElement(ContractIcon, null))
        ),
        React.createElement('h2', { className: "text-2xl font-bold text-white" }, "Método 1 + 3 + 7 + 10"),
        React.createElement('p', { className: "text-gray-400 text-sm" },
            "Entrena tu disciplina personal mediante contratos progresivos. No busques resultados inmediatos, busca no fallar a tu palabra."
        ),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 w-full max-w-xs mt-4" },
            [1, 3, 7, 10].map(d => (
                React.createElement('div', { key: d, className: "bg-gray-800 rounded-lg p-2 flex flex-col items-center" },
                    React.createElement('span', { className: "text-lg font-bold text-white" }, d),
                    React.createElement('span', { className: "text-[10px] text-gray-500 uppercase" }, "Días")
                )
            ))
        ),
        React.createElement('button', 
            {
                onClick: onStart,
                className: "w-full max-w-xs bg-primary hover:bg-purple-500 text-bkg font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
            },
            "Firmar Primer Contrato"
        )
    )
);

const ContractSetup = ({ commitments, setCommitments, onCancel, onStart }) => {
    
    const addField = () => setCommitments([...commitments, { title: '', time: '' }]);
    const updateField = (index, field, value) => {
        const newC = [...commitments];
        newC[index][field] = value;
        setCommitments(newC);
    };
    const removeField = (index) => {
        setCommitments(commitments.filter((_, i) => i !== index));
    };

    return (
        React.createElement('div', { className: "flex flex-col h-full" },
            React.createElement('div', { className: "mb-6" },
                React.createElement('h2', { className: "text-xl font-bold text-white" }, "Define tus Innegociables"),
                React.createElement('p', { className: "text-xs text-gray-400" }, "¿A qué te comprometes durante las próximas 24 horas?")
            ),
            
            React.createElement('div', { className: "flex-grow overflow-y-auto space-y-3 pb-4" },
                commitments.map((c, i) => (
                    React.createElement('div', { key: i, className: "flex gap-2 items-center bg-surface p-3 rounded-xl border border-gray-700" },
                        React.createElement('div', { className: "flex-grow space-y-2" },
                            React.createElement('input', {
                                type: "text", 
                                placeholder: "Ej: Leer 10 páginas", 
                                value: c.title,
                                onChange: (e) => updateField(i, 'title', e.target.value),
                                className: "w-full bg-transparent border-b border-gray-600 focus:border-primary outline-none py-1 text-sm"
                            }),
                            React.createElement('div', { className: "flex items-center gap-2" },
                                React.createElement('span', { className: "text-xs text-gray-500" }, "Hora (Opcional):"),
                                React.createElement('input', {
                                    type: "time", 
                                    value: c.time,
                                    onChange: (e) => updateField(i, 'time', e.target.value),
                                    className: "bg-gray-800 rounded px-2 py-1 text-xs text-white outline-none"
                                })
                            )
                        ),
                        commitments.length > 1 && (
                            React.createElement('button', { onClick: () => removeField(i), className: "text-red-500 p-2" }, React.createElement(TrashIcon, null))
                        )
                    )
                )),
                React.createElement('button', { onClick: addField, className: "w-full py-3 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white text-sm flex items-center justify-center gap-2" },
                    React.createElement(PlusIcon, null), " Añadir otro compromiso"
                )
            ),

            React.createElement('div', { className: "flex gap-3 pt-4 border-t border-gray-700" },
                React.createElement('button', { onClick: onCancel, className: "flex-1 py-3 text-gray-400 font-bold" }, "Cancelar"),
                React.createElement('button', { onClick: onStart, className: "flex-1 bg-primary text-bkg font-bold rounded-xl shadow-lg" }, "Firmar")
            )
        )
    );
};

const ActiveContractView = ({ contract, onToggle, onAdvance, onReset }) => {
    
    const allCompleted = contract.commitments.every(c => c.completedToday);
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;

    return (
        React.createElement('div', { className: "flex flex-col h-full relative" },
            /* Header / Progress */
            React.createElement('div', { className: "bg-surface p-4 rounded-2xl mb-6 shadow-lg border border-gray-800" },
                React.createElement('div', { className: "flex justify-between items-end mb-2" },
                    React.createElement('div', null,
                        React.createElement('p', { className: "text-xs text-gray-400 uppercase tracking-widest" }, "Fase Actual"),
                        React.createElement('h2', { className: "text-3xl font-bold text-white flex items-baseline gap-1" },
                            contract.currentPhase, 
                            React.createElement('span', { className: "text-sm font-normal text-gray-500" }, "Días")
                        )
                    ),
                    React.createElement('div', { className: "text-right" },
                        React.createElement('p', { className: "text-xs text-gray-400" }, "Día"),
                        React.createElement('p', { className: "text-xl font-mono text-primary" },
                            contract.dayInPhase,
                            React.createElement('span', { className: "text-gray-600" }, `/${contract.currentPhase}`)
                        )
                    )
                ),
                React.createElement('div', { className: "w-full bg-gray-900 rounded-full h-2 overflow-hidden" },
                    React.createElement('div', { className: "bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500", style: { width: `${phaseProgress}%` } })
                )
            ),

            /* Commitments List */
            React.createElement('div', { className: "flex-grow overflow-y-auto space-y-3 pb-20" },
                React.createElement('h3', { className: "text-sm font-bold text-gray-500 uppercase mb-2" }, "Tus Innegociables de Hoy"),
                contract.commitments.map(c => (
                    React.createElement('button',
                        {
                            key: c.id, 
                            onClick: () => onToggle(c.id),
                            className: `w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                                c.completedToday 
                                ? 'bg-green-900/20 border-green-900/50' 
                                : 'bg-surface border-gray-700 hover:border-gray-500'
                            }`
                        },
                        React.createElement('div', null,
                            React.createElement('p', { className: `font-bold ${c.completedToday ? 'text-green-400 line-through' : 'text-white'}` }, c.title),
                            c.time && React.createElement('p', { className: "text-xs text-gray-500 mt-1" }, `⏰ ${c.time}`)
                        ),
                        React.createElement('div', { className: `w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            c.completedToday ? 'border-green-500 bg-green-500 text-black' : 'border-gray-600 group-hover:border-primary'
                        }` },
                            c.completedToday && React.createElement(CheckCircleIcon, null)
                        )
                    )
                ))
            ),

            /* Actions Footer */
            React.createElement('div', { className: "fixed bottom-24 left-4 right-4 max-w-md mx-auto" },
                isPhaseDone && allCompleted ? (
                    React.createElement('div', { className: "bg-surface p-4 rounded-xl border border-green-500 shadow-2xl animate-bounce" },
                        React.createElement('p', { className: "text-center font-bold text-green-400 mb-2" }, `¡Fase ${contract.currentPhase} Completada!`),
                        contract.currentPhase === 10 ? (
                            React.createElement('button', { onClick: onReset, className: "w-full bg-green-500 text-black font-bold py-3 rounded-lg" },
                                "¡Disciplina Maestra Conseguida! (Reiniciar)"
                            )
                        ) : (
                            React.createElement('button', { onClick: onAdvance, className: "w-full bg-green-500 text-black font-bold py-3 rounded-lg" },
                                `Firmar por ${contract.currentPhase === 1 ? 3 : contract.currentPhase === 3 ? 7 : 10} Días`
                            )
                        )
                    )
                ) : (
                    React.createElement('div', { className: "flex justify-center" },
                        React.createElement('button', 
                            {
                                onClick: () => {
                                    if (confirm("¿Seguro que quieres romper el contrato? Volverás al inicio.")) {
                                        onReset();
                                    }
                                },
                                className: "text-xs text-red-900 hover:text-red-500 font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm"
                            },
                            "Romper Contrato (Reiniciar)"
                        )
                    )
                )
            )
        )
    );
};

export default DisciplineView;
