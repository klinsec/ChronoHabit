
import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider, useTimeTracker } from '@/context/TimeTrackerContext';
import TimerView from '@/components/views/TimerView';
import HistoryView from '@/components/views/HistoryView';
import StatsViewUpdated from '@/components/views/StatsView';
import TasksView from '@/components/views/TasksView';
import RoutinesView from '@/components/views/RoutinesView';
import BottomNav from '@/components/BottomNav';
import { ClockIcon, ChartIcon, ChecklistIcon, RoutineIcon } from '@/components/Icons';
import { View } from '@/types';
import ErrorBoundary from '@/components/ErrorBoundary';

const APP_VERSION = '1.5.15';

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
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem('currentView');
      return (saved as View) || 'tasks';
    } catch (e) {
      return 'tasks';
    }
  });

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    // Strictly prevent default install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto-update logic
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          if (data.version && data.version !== APP_VERSION) {
            console.log(`New version detected: ${data.version}. Updating...`);
            // Force reload to get new version
            window.location.reload();
          }
        }
      } catch (e) {
        console.error('Error checking version:', e);
      }
    };

    const interval = setInterval(checkVersion, 1000 * 60 * 5); // Check every 5 minutes
    checkVersion();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'timer': return <TimerView />;
      case 'routines': return <RoutinesView />;
      case 'tasks': return <TasksView />;
      case 'stats': return <StatsViewUpdated />;
      case 'history': return <HistoryView />;
      default: return <TasksView />;
    }
  };

  const navItems = [
    { id: 'tasks' as View, label: 'Tareas', icon: <ChecklistIcon /> },
    { id: 'routines' as View, label: 'Rutinas', icon: <RoutineIcon /> },
    { id: 'timer' as View, label: 'Cronómetro', icon: <ClockIcon /> },
    { id: 'stats' as View, label: 'Stats', icon: <ChartIcon /> },
  ];

  const renderViewSafe = () => {
    try {
      return renderView();
    } catch (e) {
      console.error("Error rendering view:", e);
      return (
        <div className="p-4 text-center">
          <p className="text-red-500 font-bold">Error al cargar la vista</p>
          <button onClick={() => setCurrentView('tasks')} className="mt-2 bg-primary text-bkg px-4 py-2 rounded-lg">
            Volver a Tareas
          </button>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-bkg text-on-bkg font-sans">
      <header className="p-4 bg-surface shadow-lg flex items-center justify-center flex-shrink-0 z-20">
        <h1 className="text-2xl font-bold text-primary tracking-wider flex items-center">
            ChronoHabit
            <CloudIconIndicator />
        </h1>
        <span className="absolute top-2 right-2 text-[10px] text-gray-600 font-mono">v{APP_VERSION}</span>
      </header>
      
      <main className="flex-grow flex-1 p-4 overflow-y-auto pb-32 min-h-0 z-0 touch-pan-y">
        {renderViewSafe()}
      </main>
      <BottomNav items={navItems} currentView={currentView} setCurrentView={setCurrentView} />
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
