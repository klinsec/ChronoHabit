
import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider, useTimeTracker } from './context/TimeTrackerContext';
import TimerView from './components/views/TimerView';
import HistoryView from './components/views/HistoryView';
import StatsView from './components/views/StatsView';
import TasksView from './components/views/TasksView';
import RoutinesView from './components/views/RoutinesView';
import DisciplineView from './components/views/DisciplineView';
import BottomNav from './components/BottomNav';
import { ClockIcon, ChartIcon, ChecklistIcon, RoutineIcon, ContractIcon } from './components/Icons';
import { View } from './types';
import ErrorBoundary from './components/ErrorBoundary';

const APP_VERSION = '1.4.8';

const CloudIconIndicator = () => {
    const { cloudStatus } = useTimeTracker();
    let color = 'text-gray-600';
    let animation = '';
    
    if (cloudStatus === 'connected') color = 'text-green-500';
    if (cloudStatus === 'syncing') { color = 'text-primary'; animation = 'animate-bounce'; }
    if (cloudStatus === 'error') color = 'text-red-500';

    return (
        <div className={`ml-2 transition-colors duration-300 ${color} ${animation}`} title={`Nube: ${cloudStatus}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" />
            </svg>
        </div>
    );
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('tasks');
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    const handleSWUpdateFound = (e: any) => {
      const registration = e.detail;
      if (registration && registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdateModal(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('sw-update-found', handleSWUpdateFound);
    
    // Check initial state
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                setWaitingWorker(reg.waiting);
                setShowUpdateModal(true);
            }
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('sw-update-found', handleSWUpdateFound);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'timer': return <TimerView />;
      case 'routines': return <RoutinesView />;
      case 'discipline': return <DisciplineView />;
      case 'tasks': return <TasksView />;
      case 'stats': return <StatsView />;
      case 'history': return <HistoryView />;
      default: return <TasksView />;
    }
  };

  const navItems = [
    { id: 'tasks' as View, label: 'Tareas', icon: <ChecklistIcon /> },
    { id: 'routines' as View, label: 'Rutinas', icon: <RoutineIcon /> },
    { id: 'timer' as View, label: 'Cronómetro', icon: <ClockIcon /> },
    { id: 'discipline' as View, label: 'Disciplina', icon: <ContractIcon /> },
    { id: 'stats' as View, label: 'Stats', icon: <ChartIcon /> },
  ];

  return (
    <div className="flex flex-col min-h-screen h-[100dvh] max-w-md mx-auto bg-bkg text-on-bkg font-sans relative overflow-hidden">
      <header className="p-4 bg-surface shadow-lg flex items-center justify-center flex-shrink-0 z-20 relative">
        <h1 className="text-2xl font-bold text-primary tracking-wider flex items-center">
            ChronoHabit
            <CloudIconIndicator />
        </h1>
        <span className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono">v{APP_VERSION}</span>
      </header>
      {showInstallBanner && (
        <div className="bg-surface p-3 flex items-center justify-between gap-4 border-b border-gray-700 flex-shrink-0 z-20">
          <p className="text-sm text-on-surface flex-grow">Instala ChronoHabit para una mejor experiencia.</p>
          <div className="flex-shrink-0 flex gap-2">
            <button onClick={() => setShowInstallBanner(false)} className="text-xs font-semibold text-gray-400 px-3 py-1 rounded-md">Ahora no</button>
            <button onClick={handleInstallClick} className="text-xs font-bold bg-primary text-bkg px-3 py-1 rounded-md">Instalar</button>
          </div>
        </div>
      )}
      <main className="flex-grow p-4 overflow-y-auto pb-28 relative z-0">
        {renderView()}
      </main>
      <BottomNav items={navItems} currentView={currentView} setCurrentView={setCurrentView} />
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-6">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-primary/40 shadow-2xl">
            <h2 className="text-xl font-bold mb-3 text-on-surface">¡Actualización Disponible!</h2>
            <p className="text-gray-300 mb-6 text-sm">Nueva versión {APP_VERSION} lista para instalar.</p>
            <button onClick={() => { if(waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' }); setShowUpdateModal(false); }} className="w-full bg-primary text-bkg font-bold py-3 px-4 rounded-xl">Actualizar Ahora</button>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
    <ErrorBoundary>
        <TimeTrackerProvider>
            <AppContent />
        </TimeTrackerProvider>
    </ErrorBoundary>
);

export default App;
