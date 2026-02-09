
import React, { useState } from 'react';
import { useTimeTracker } from '../../context/TimeTrackerContext.js';
import { CheckCircleIcon, PlusIcon, TrashIcon, RoutineIcon, HistoryIcon, FloppyDiskIcon, FolderIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon } from '../Icons.js';

const RoutinesView = () => {
  const { contract, startContract, toggleCommitment, setCommitmentStatus, resetContract, completeContract, pastContracts, saveRoutine, savedRoutines, deleteRoutine } = useTimeTracker();
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  const [newCommitments, setNewCommitments] = useState([
      { title: '', time: '' }
  ]);
  const [allowedDays, setAllowedDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  const handleStartSetup = (duration) => {
      setSelectedDuration(duration);
      if (!contract) {
          setNewCommitments([{ title: '', time: '' }]);
          setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      }
      setIsSetupOpen(true);
  };

  const handleNextContract = () => {
      if (contract) {
          const existing = contract.commitments.map(c => ({ title: c.title, time: c.time || '' }));
          setNewCommitments(existing);
          setAllowedDays(contract.allowedDays || [0, 1, 2, 3, 4, 5, 6]);
          
          let nextDuration = contract.currentPhase;
          if (contract.currentPhase === 1) nextDuration = 3;
          else if (contract.currentPhase === 3) nextDuration = 7;
          else if (contract.currentPhase === 7) nextDuration = 10;
          else if (contract.currentPhase === 10) nextDuration = 14;
          else nextDuration = contract.currentPhase + 7;

          setSelectedDuration(nextDuration); 
          setIsSetupOpen(true);
      }
  };

  const handleReuseFromHistory = (item) => {
      const reconstructed = item.commitmentsSnapshot.map(title => ({ title, time: '' }));
      setNewCommitments(reconstructed);
      setSelectedDuration(item.phaseDuration);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
      setShowHistory(false);
      setIsSetupOpen(true);
  };

  const handleLoadTemplate = (routine) => {
      setNewCommitments(routine.commitments);
      if (routine.allowedDays) setAllowedDays(routine.allowedDays);
      setShowLoadModal(false);
      setIsSetupOpen(true);
  };

  return React.createElement('div', { className: "relative h-full flex flex-col" },
      /* Top Actions */
      React.createElement('div', { className: "absolute top-0 right-0 z-10 flex gap-1" },
            /* Save Button: Only when contract is active */
            contract && !isSetupOpen && (
                React.createElement('button', 
                    {
                        onClick: () => setShowSaveModal(true),
                        className: "p-2 text-gray-600 hover:text-white transition-colors",
                        title: "Guardar como Plantilla"
                    },
                    React.createElement(FloppyDiskIcon, null)
                )
            ),
            
            /* Load & History Buttons: Only when NO contract is active */
            !contract && !isSetupOpen && (
                React.createElement(React.Fragment, null,
                    React.createElement('button', 
                        {
                            onClick: () => setShowLoadModal(true),
                            className: "p-2 text-gray-600 hover:text-white transition-colors",
                            title: "Mis Plantillas"
                        },
                        React.createElement(FolderIcon, null)
                    ),
                    React.createElement('button', 
                        {
                            onClick: () => setShowHistory(true),
                            className: "p-2 text-gray-600 hover:text-white transition-colors",
                            title: "Historial de Contratos"
                        },
                        React.createElement(HistoryIcon, null)
                    )
                )
            )
      ),
      
      isSetupOpen ? (
          React.createElement(ContractSetup, {
            commitments: newCommitments,
            setCommitments: setNewCommitments,
            duration: selectedDuration,
            setDuration: setSelectedDuration,
            allowedDays: allowedDays,
            setAllowedDays: setAllowedDays,
            onCancel: () => setIsSetupOpen(false),
            onStart: () => {
                startContract(newCommitments.filter(c => c.title.trim() !== ''), selectedDuration, allowedDays);
                setIsSetupOpen(false);
            },
            onSaveRoutine: saveRoutine,
            savedRoutines: savedRoutines,
            onDeleteRoutine: deleteRoutine
        })
      ) : !contract ? (
          React.createElement(Onboarding, { onStart: handleStartSetup })
      ) : (
        React.createElement(ActiveContractView, {
            contract: contract,
            onStatusChange: setCommitmentStatus,
            onNext: handleNextContract,
            onReset: resetContract,
            onComplete: completeContract
        })
      ),

      showHistory && React.createElement(HistoryModal, { 
          pastContracts: pastContracts, 
          onClose: () => setShowHistory(false),
          onReuse: handleReuseFromHistory,
          onSaveTemplate: (title, commitments) => {
              saveRoutine(title, commitments);
              setShowHistory(false);
          }
      }),

      showLoadModal && React.createElement(LoadRoutineModal, {
          savedRoutines: savedRoutines,
          onClose: () => setShowLoadModal(false),
          onLoad: handleLoadTemplate,
          onDelete: deleteRoutine
      }),

      showSaveModal && contract && (
          React.createElement(SaveRoutineModal, {
              onClose: () => setShowSaveModal(false),
              onSave: (name) => {
                  const cleanCommitments = contract.commitments.map(c => ({ title: c.title, time: c.time }));
                  saveRoutine(name, cleanCommitments, contract.allowedDays);
                  setShowSaveModal(false);
              }
          })
      )
  );
};

const SwipeableCommitment = ({ commitment, onChangeStatus }) => {
    const [touchStart, setTouchStart] = useState(null);
    const [translateX, setTranslateX] = useState(0);
    const minSwipeDistance = 75;

    const onTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
    
    const onTouchMove = (e) => {
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
        icon = React.createElement('div', { className: "text-green-500" }, React.createElement(CheckCircleIcon, null));
    } else if (commitment.status === 'failed') {
        bgClass = 'bg-red-900/20 border-red-900/50 opacity-70';
        textClass = 'text-red-400';
        icon = React.createElement('div', { className: "text-red-500" }, React.createElement(XMarkIcon, null));
    } else {
        icon = React.createElement('div', { className: "w-6 h-6 rounded-full border-2 border-gray-600" });
    }

    return (
        React.createElement('div', { className: "relative overflow-hidden rounded-xl select-none" },
            React.createElement('div', { className: "absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-gray-900 border border-gray-800" },
                React.createElement('div', { className: `font-bold text-red-500 flex items-center transition-opacity duration-200 ${translateX > 30 ? 'opacity-100' : 'opacity-0'}` },
                    React.createElement(XMarkIcon, null),
                    React.createElement('span', { className: "text-xs ml-1 font-bold" }, "FALLADO")
                ),
                React.createElement('div', { className: `font-bold text-gray-400 flex items-center transition-opacity duration-200 ${translateX < -30 ? 'opacity-100' : 'opacity-0'}` },
                    React.createElement('span', { className: "text-xs mr-1 font-bold" }, "RESETEAR"),
                    React.createElement(ArrowUpIcon, null)
                )
            ),

            React.createElement('div', 
                {
                    className: `relative w-full text-left p-4 rounded-xl border transition-transform duration-200 flex items-center justify-between group ${bgClass}`,
                    style: { transform: `translateX(${translateX}px)` },
                    onTouchStart: onTouchStart,
                    onTouchMove: onTouchMove,
                    onTouchEnd: onTouchEnd,
                    onClick: handleClick
                },
                React.createElement('div', null,
                    React.createElement('p', { className: `font-bold ${textClass}` }, commitment.title),
                    commitment.time && React.createElement('p', { className: "text-xs text-gray-500 mt-1" }, `⏰ ${commitment.time}`)
                ),
                React.createElement('div', { className: "flex-shrink-0 ml-2" }, icon)
            )
        )
    );
};

const LoadRoutineModal = ({ savedRoutines, onClose, onLoad, onDelete }) => {
    return (
        React.createElement('div', { className: "absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" },
            React.createElement('div', { className: "bg-surface rounded-2xl p-4 w-full h-3/4 border border-gray-700 flex flex-col max-w-sm shadow-2xl" },
                React.createElement('div', { className: "flex justify-between items-center mb-4 border-b border-gray-700 pb-2" },
                    React.createElement('h3', { className: "text-lg font-bold text-white" }, "Mis Plantillas"),
                    React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white text-xl" }, "✕")
                ),
                React.createElement('div', { className: "flex-grow overflow-y-auto space-y-2" },
                    savedRoutines.length === 0 ? (
                        React.createElement('div', { className: "flex flex-col items-center justify-center h-full text-gray-500 space-y-2" },
                            React.createElement(FolderIcon, null),
                            React.createElement('p', { className: "text-sm" }, "No tienes rutinas guardadas.")
                        )
                    ) : (
                        savedRoutines.map(r => (
                            React.createElement('div', { key: r.id, className: "bg-gray-800/50 p-3 rounded-xl border border-gray-700 group hover:border-gray-500 transition-colors" },
                                React.createElement('div', { className: "flex justify-between items-center mb-2" },
                                    React.createElement('span', { className: "font-bold text-white text-lg" }, r.title),
                                    React.createElement('button', { onClick: (e) => { e.stopPropagation(); if(confirm("¿Borrar plantilla?")) onDelete(r.id); }, className: "text-gray-500 hover:text-red-400 p-1" }, React.createElement(TrashIcon, null))
                                ),
                                React.createElement('p', { className: "text-xs text-gray-400 mb-3" }, `${r.commitments.length} compromisos`),
                                React.createElement('button', 
                                    { 
                                        onClick: () => onLoad(r),
                                        className: "w-full bg-gray-700 hover:bg-primary hover:text-bkg text-white py-2 rounded-lg text-sm font-bold transition-colors"
                                    },
                                    "Cargar Rutina"
                                )
                            )
                        ))
                    )
                )
            )
        )
    );
};

const SaveRoutineModal = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    return (
        React.createElement('div', { className: "absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" },
            React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full border border-gray-700" },
                React.createElement('h3', { className: "text-lg font-bold mb-3" }, "Guardar Rutina Actual"),
                React.createElement('input', {
                    type: "text", 
                    placeholder: "Nombre de la rutina (Ej: Entrenamiento)",
                    value: name,
                    onChange: e => setName(e.target.value),
                    className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4",
                    autoFocus: true
                }),
                React.createElement('div', { className: "flex justify-end gap-2" },
                    React.createElement('button', { onClick: onClose, className: "px-4 py-2 text-gray-400 font-bold" }, "Cancelar"),
                    React.createElement('button', { onClick: () => { if(name.trim()) onSave(name); }, disabled: !name.trim(), className: "px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50" }, "Guardar")
                )
            )
        )
    );
};

const HistoryModal = ({ pastContracts, onClose, onReuse, onSaveTemplate }) => {
    const [savingItem, setSavingItem] = useState(null);
    const [templateName, setTemplateName] = useState('');

    const handleSaveSubmit = () => {
        if (savingItem && templateName.trim()) {
            const reconstructed = savingItem.commitmentsSnapshot.map(title => ({ title, time: '' }));
            onSaveTemplate(templateName, reconstructed);
            setSavingItem(null);
            setTemplateName('');
        }
    };

    return (
        React.createElement('div', { className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" },
            savingItem ? (
                 React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl" },
                    React.createElement('h3', { className: "text-lg font-bold mb-3" }, "Guardar Historial como Plantilla"),
                    React.createElement('input', {
                        type: "text", 
                        placeholder: "Nombre de la plantilla",
                        value: templateName,
                        onChange: e => setTemplateName(e.target.value),
                        className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4",
                        autoFocus: true
                    }),
                    React.createElement('div', { className: "flex justify-end gap-2" },
                        React.createElement('button', { onClick: () => setSavingItem(null), className: "px-4 py-2 text-gray-400 font-bold" }, "Cancelar"),
                        React.createElement('button', { onClick: handleSaveSubmit, disabled: !templateName.trim(), className: "px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50" }, "Guardar")
                    )
                )
            ) : (
                React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl max-h-[80vh] flex flex-col" },
                    React.createElement('h2', { className: "text-xl font-bold mb-4 text-on-surface border-b border-gray-700 pb-2" }, "Historial Reciente"),
                    React.createElement('div', { className: "flex-grow overflow-y-auto space-y-3" },
                        pastContracts.length === 0 ? (
                             React.createElement('p', { className: "text-gray-500 text-center py-4 text-sm" }, "No hay contratos archivados aún.")
                        ) : (
                            pastContracts.map((item) => (
                                React.createElement('div', { key: item.id, className: "bg-gray-800/50 p-3 rounded-xl border border-gray-700" },
                                    React.createElement('div', { className: "flex justify-between items-center mb-2" },
                                        React.createElement('div', null,
                                            React.createElement('div', { className: "flex items-center gap-2 mb-1" },
                                                React.createElement('span', { className: "font-bold text-white" }, `${item.phaseDuration} Días`),
                                                React.createElement('span', { className: "text-[10px] text-gray-500" },
                                                    new Date(item.endDate).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})
                                                )
                                            ),
                                            React.createElement('div', { className: `px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                                                item.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                            }` },
                                                item.status === 'completed' ? 'Completado' : 'Fallido'
                                            )
                                        ),
                                        React.createElement('p', { className: "text-xs text-gray-400 text-right" },
                                            `${item.commitmentsSnapshot.length} Compromisos`
                                        )
                                    ),
                                    React.createElement('div', { className: "flex gap-2 mt-2 pt-2 border-t border-gray-700/50" },
                                        React.createElement('button', { onClick: () => onReuse(item), className: "flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs font-bold" },
                                            "Reusar"
                                        ),
                                        React.createElement('button', { onClick: () => setSavingItem(item), className: "flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs font-bold" },
                                            "Guardar"
                                        )
                                    )
                                )
                            ))
                        )
                    ),
                    React.createElement('button', { onClick: onClose, className: "mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-white text-sm" },
                        "Cerrar"
                    )
                )
            )
        )
    );
}

const Onboarding = ({ onStart }) => {
    const [customDays, setCustomDays] = useState('');

    return React.createElement('div', { className: "flex flex-col h-full items-center justify-center p-6 text-center space-y-6 animate-in fade-in zoom-in duration-300" },
        React.createElement('div', { className: "p-4 bg-primary/10 rounded-full text-primary" },
            React.createElement('div', { className: "transform scale-150" }, React.createElement(RoutineIcon, null))
        ),
        React.createElement('h2', { className: "text-2xl font-bold text-white" }, "Método 1 + 3 + 7 + 10"),
        React.createElement('p', { className: "text-gray-400 text-sm" },
            "Selecciona la duración de tu próximo contrato de disciplina."
        ),
        React.createElement('div', { className: "grid grid-cols-4 gap-2 w-full max-w-xs mt-4" },
            [1, 3, 7, 10].map(d => (
                React.createElement('button', 
                    {
                        key: d,
                        onClick: () => onStart(d),
                        className: "bg-gray-800 hover:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors"
                    },
                    React.createElement('span', { className: "text-lg font-bold text-white" }, d),
                    React.createElement('span', { className: "text-[10px] text-gray-500 uppercase" }, "Días")
                )
            ))
        ),
        React.createElement('div', { className: "flex items-center space-x-2 w-full max-w-xs bg-gray-800 rounded-lg p-2" },
            React.createElement('span', { className: "text-xs text-gray-400 pl-2" }, "Otro:"),
            React.createElement('input', {
                type: "number",
                value: customDays,
                onChange: (e) => setCustomDays(e.target.value),
                placeholder: "#",
                className: "bg-transparent w-full text-white outline-none font-bold"
            }),
            React.createElement('button', 
                {
                    onClick: () => {
                        const d = parseInt(customDays);
                        if (d > 0) onStart(d);
                    },
                    disabled: !customDays,
                    className: "text-xs bg-primary text-bkg font-bold px-3 py-1 rounded disabled:opacity-50"
                },
                "OK"
            )
        )
    );
};

const ContractSetup = ({ commitments, setCommitments, duration, setDuration, allowedDays, setAllowedDays, onCancel, onStart, onSaveRoutine, savedRoutines, onDeleteRoutine }) => {
    
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [routineName, setRoutineName] = useState('');

    const addField = () => setCommitments([...commitments, { title: '', time: '' }]);
    const updateField = (index, field, value) => {
        const newC = [...commitments];
        newC[index][field] = value;
        setCommitments(newC);
    };
    const removeField = (index) => {
        setCommitments(commitments.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!routineName.trim()) return;
        onSaveRoutine(routineName, commitments.filter(c => c.title.trim()), allowedDays);
        setRoutineName('');
        setShowSaveModal(false);
    };

    const toggleDay = (dayIndex) => {
        setAllowedDays(prev => {
            if (prev.includes(dayIndex)) {
                if (prev.length === 1) return prev;
                return prev.filter(d => d !== dayIndex);
            }
            return [...prev, dayIndex].sort();
        });
    };

    const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

    return (
        React.createElement('div', { className: "flex flex-col h-full mt-8 relative" },
            React.createElement('div', { className: "mb-4 flex justify-between items-start" },
                React.createElement('div', null,
                    React.createElement('h2', { className: "text-xl font-bold text-white" }, "Nuevo Contrato"),
                    React.createElement('div', { className: "flex items-center gap-2 mt-2" },
                        React.createElement('span', { className: "text-sm text-gray-400" }, "Duración (días):"),
                        React.createElement('input', {
                            type: "number",
                            value: duration,
                            onChange: (e) => setDuration(parseInt(e.target.value) || 1),
                            className: "bg-gray-800 text-white font-bold rounded px-2 py-1 w-16 text-center"
                        })
                    )
                ),
                React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', { onClick: () => setShowSaveModal(true), className: "p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300", title: "Guardar Rutina" },
                        React.createElement(FloppyDiskIcon, null)
                    )
                )
            ),
            
            /* Days Selector */
            React.createElement('div', { className: "mb-4 bg-surface p-3 rounded-xl border border-gray-700" },
                React.createElement('p', { className: "text-xs text-gray-500 uppercase tracking-widest mb-2" }, "Días Activos"),
                React.createElement('div', { className: "flex justify-between" },
                    [1, 2, 3, 4, 5, 6, 0].map((d) => (
                        React.createElement('button', {
                            key: d,
                            onClick: () => toggleDay(d),
                            className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                allowedDays.includes(d) 
                                ? 'bg-primary text-bkg scale-110 shadow-lg' 
                                : 'bg-gray-800 text-gray-500'
                            }`
                        }, dayLabels[d])
                    ))
                )
            ),

            React.createElement('div', { className: "flex-grow overflow-y-auto space-y-3 pb-4" },
                React.createElement('p', { className: "text-xs text-gray-500 uppercase tracking-widest" }, "Mis Innegociables"),
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
                React.createElement('button', { onClick: onStart, className: "flex-1 bg-primary text-bkg font-bold rounded-xl shadow-lg" }, "Firmar Contrato")
            ),

            /* Save Routine Modal */
            showSaveModal && (
                React.createElement('div', { className: "absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" },
                    React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full border border-gray-700" },
                        React.createElement('h3', { className: "text-lg font-bold mb-3" }, "Guardar Rutina"),
                        React.createElement('input', {
                            type: "text", 
                            placeholder: "Nombre de la rutina (Ej: Mañanera)",
                            value: routineName,
                            onChange: e => setRoutineName(e.target.value),
                            className: "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4",
                            autoFocus: true
                        }),
                        React.createElement('div', { className: "flex justify-end gap-2" },
                            React.createElement('button', { onClick: () => setShowSaveModal(false), className: "px-4 py-2 text-gray-400 font-bold" }, "Cancelar"),
                            React.createElement('button', { onClick: handleSave, disabled: !routineName.trim(), className: "px-4 py-2 bg-primary text-bkg font-bold rounded-lg disabled:opacity-50" }, "Guardar")
                        )
                    )
                )
            )
        )
    );
};

const ActiveContractView = ({ contract, onStatusChange, onNext, onReset, onComplete }) => {
    
    const allCompleted = contract.commitments.every(c => c.status === 'completed');
    const phaseProgress = (contract.dayInPhase / contract.currentPhase) * 100;
    const isPhaseDone = contract.dayInPhase >= contract.currentPhase;

    // Check Rest Day
    const todayDay = new Date().getDay();
    const isRestDay = contract.allowedDays && !contract.allowedDays.includes(todayDay);

    if (isRestDay) {
        return (
            React.createElement('div', { className: "flex flex-col h-full mt-8 items-center justify-center text-center p-6 space-y-6" },
                React.createElement('div', { className: "bg-gray-800 p-6 rounded-full" },
                    React.createElement('span', { className: "text-4xl" }, "😴")
                ),
                React.createElement('div', null,
                    React.createElement('h2', { className: "text-2xl font-bold text-white mb-2" }, "Día de Descanso"),
                    React.createElement('p', { className: "text-gray-400" }, "Hoy no está marcado en tu rutina. ¡Relájate y recarga energías!")
                ),
                React.createElement('div', { className: "w-full max-w-xs bg-surface p-4 rounded-xl border border-gray-700" },
                    React.createElement('p', { className: "text-xs text-gray-500 uppercase tracking-widest mb-1" }, "Progreso Actual"),
                    React.createElement('div', { className: "flex justify-between items-end mb-2" },
                        React.createElement('span', { className: "font-bold text-xl" },
                            contract.dayInPhase,
                            React.createElement('span', { className: "text-sm text-gray-500" }, ` / ${contract.currentPhase} días`)
                        )
                    ),
                    React.createElement('div', { className: "w-full bg-gray-900 rounded-full h-2 overflow-hidden" },
                        React.createElement('div', { className: "bg-gray-600 h-full", style: { width: `${phaseProgress}%` } })
                    )
                )
            )
        );
    }

    return (
        React.createElement('div', { className: "flex flex-col h-full mt-8" },
            /* Header / Progress */
            React.createElement('div', { className: "bg-surface p-4 rounded-2xl mb-6 shadow-lg border border-gray-800 relative" },
                React.createElement('div', { className: "flex justify-between items-end mb-2" },
                    React.createElement('div', null,
                        React.createElement('p', { className: "text-xs text-gray-400 uppercase tracking-widest" }, "Contrato Actual"),
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
            React.createElement('div', { className: "flex-grow overflow-y-auto space-y-3 pb-24" },
                React.createElement('h3', { className: "text-sm font-bold text-gray-500 uppercase mb-2" }, "Tus Innegociables de Hoy"),
                contract.commitments.map(c => (
                    React.createElement(SwipeableCommitment,
                        {
                            key: c.id, 
                            commitment: c,
                            onChangeStatus: onStatusChange
                        }
                    )
                ))
            ),

            /* Actions Footer */
            React.createElement('div', { className: "fixed bottom-24 left-4 right-4 max-w-md mx-auto" },
                isPhaseDone && allCompleted ? (
                    React.createElement('div', { className: "bg-surface p-4 rounded-xl border border-green-500 shadow-2xl animate-in slide-in-from-bottom-20 fade-in duration-700 space-y-3" },
                        React.createElement('p', { className: "text-center font-bold text-green-400" }, "¡Contrato Completado!"),
                        React.createElement('button', { onClick: onNext, className: "w-full bg-green-500 text-black font-bold py-3 rounded-lg shadow-lg" },
                            "Siguiente Contrato (Refinar)"
                        ),
                        React.createElement('button', { onClick: onComplete, className: "w-full bg-gray-700 text-white font-bold py-2 rounded-lg text-sm" },
                            "Finalizar y Volver al Menú"
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
                                className: "text-xs text-red-900 hover:text-red-500 font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-red-900/30"
                            },
                            "Romper Contrato (Reiniciar)"
                        )
                    )
                )
            )
        )
    );
};

export default RoutinesView;
