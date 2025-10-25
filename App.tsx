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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      <div className="flex flex-col h-screen max-w-md mx-auto bg-bkg font-sans">
        <header className="p-4 bg-surface shadow-lg flex items-center justify-center gap-3">
          <img src="./icon-192.png" alt="ChronoHabit Logo" className="w-9 h-9" />
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
      </div>
    </TimeTrackerProvider>
  );
};

export default App;