
import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider } from './context/TimeTrackerContext';
import TimerView from './components/views/TimerView';
import HistoryView from './components/views/HistoryView';
import StatsView from './components/views/StatsView';
import TasksView from './components/views/TasksView';
import BottomNav from './components/BottomNav';
import { ClockIcon, ListIcon, ChartIcon, ChecklistIcon } from './components/Icons';
import { View } from './types';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('timer');
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

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('sw-update-found', handleSWUpdateFound);
    };
  }, []);


  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // The type assertion is needed because the default Event type doesn't include prompt()
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  const handleUpdateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdateModal(false);
  };


  const renderView = () => {
    switch (currentView) {
      case 'timer':
        return <TimerView />;
      case 'history':
        return <HistoryView />;
      case 'stats':
        return <StatsView />;
      case 'tasks':
        return <TasksView />;
      default:
        return <TimerView />;
    }
  };

  const navItems = [
    { id: 'timer' as View, label: 'Cronómetro', icon: <ClockIcon /> },
    { id: 'history' as View, label: 'Historial', icon: <ListIcon /> },
    { id: 'stats' as View, label: 'Estadísticas', icon: <ChartIcon /> },
    { id: 'tasks' as View, label: 'Tareas', icon: <ChecklistIcon /> },
  ];

  return (
    <TimeTrackerProvider>
      <div className="flex flex-col h-screen max-w-md mx-auto bg-bkg font-sans relative">
        <header className="p-4 bg-surface shadow-lg flex items-center justify-center">
          <h1 className="text-2xl font-bold text-primary tracking-wider">ChronoHabit</h1>
        </header>
        {showInstallBanner && (
          <div className="bg-surface p-3 flex items-center justify-between gap-4 border-b border-gray-700">
            <p className="text-sm text-on-surface flex-grow">Instala ChronoHabit en tu dispositivo para una mejor experiencia.</p>
            <div className="flex-shrink-0 flex gap-2">
              <button onClick={() => setShowInstallBanner(false)} className="text-xs font-semibold text-gray-400 px-3 py-1 rounded-md hover:bg-gray-700">Ahora no</button>
              <button onClick={handleInstallClick} className="text-xs font-bold bg-primary text-bkg px-3 py-1 rounded-md hover:bg-purple-500">Instalar</button>
            </div>
          </div>
        )}
        <main className="flex-grow p-4 overflow-y-auto pb-28">
          {renderView()}
        </main>
        <BottomNav items={navItems} currentView={currentView} setCurrentView={setCurrentView} />

        {/* Update Modal */}
        {showUpdateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-6">
            <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-primary/40 shadow-2xl">
              <h2 className="text-xl font-bold mb-3 text-on-surface">¡Actualización Disponible!</h2>
              <p className="text-gray-300 mb-6 text-sm">
                Hay una nueva versión de ChronoHabit lista para usar. Actualiza ahora para obtener las últimas funciones y mejoras. Tus datos están seguros.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleUpdateApp}
                  className="w-full bg-primary hover:bg-purple-500 text-bkg font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 shadow-lg"
                >
                  Actualizar ahora
                </button>
                <button 
                  onClick={() => setShowUpdateModal(false)}
                  className="w-full bg-transparent hover:bg-gray-800 text-gray-400 font-semibold py-2 px-4 rounded-xl transition-colors"
                >
                  Más tarde
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TimeTrackerProvider>
  );
};

export default App;
