
import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider, useTimeTracker } from './context/TimeTrackerContext.js';
import TimerView from './components/views/TimerView.js';
import HistoryView from './components/views/HistoryView.js';
import StatsView from './components/views/StatsView.js';
import TasksView from './components/views/TasksView.js';
import RoutinesView from './components/views/RoutinesView.js';
import DisciplineView from './components/views/DisciplineView.js';
import BottomNav from './components/BottomNav.js';
import { ClockIcon, ChartIcon, ChecklistIcon, RoutineIcon, ContractIcon } from './components/Icons.js';
import ErrorBoundary from './components/ErrorBoundary.js';

const APP_VERSION = '1.4.9';

const CloudIconIndicator = () => {
    const { cloudStatus } = useTimeTracker();
    let color = 'text-gray-600';
    let animation = '';
    
    if (cloudStatus === 'connected') color = 'text-green-500';
    if (cloudStatus === 'syncing') { color = 'text-primary'; animation = 'animate-bounce'; }
    if (cloudStatus === 'error') color = 'text-red-500';

    return React.createElement('div', { 
        className: `ml-2 transition-colors duration-300 ${color} ${animation}`, 
        title: `Nube: ${cloudStatus}` 
    },
        React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor" },
            React.createElement('path', { d: "M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" })
        )
    );
};

const AppContent = () => {
  const [currentView, setCurrentView] = useState('tasks');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    // Assistant Deep Link Check
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === 'task') {
        setCurrentView('tasks');
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };

    const handleSWUpdateFound = (e) => {
      const registration = e.detail;
      if (registration && registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdateModal(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('sw-update-found', handleSWUpdateFound);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then(reg => {
          if (reg && reg.waiting) {
            setWaitingWorker(reg.waiting);
            setShowUpdateModal(true);
          }
        })
        .catch(err => {
           console.warn('Service Worker getRegistration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('sw-update-found', handleSWUpdateFound);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
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
      case 'timer': return React.createElement(TimerView, null);
      case 'routines': return React.createElement(RoutinesView, null);
      case 'discipline': return React.createElement(DisciplineView, null);
      case 'tasks': return React.createElement(TasksView, null);
      case 'stats': return React.createElement(StatsView, null);
      case 'history': return React.createElement(HistoryView, null);
      default: return React.createElement(TasksView, null);
    }
  };

  const navItems = [
    { id: 'tasks', label: 'Tareas', icon: React.createElement(ChecklistIcon, null) },
    { id: 'routines', label: 'Rutinas', icon: React.createElement(RoutineIcon, null) },
    { id: 'timer', label: 'Cronómetro', icon: React.createElement(ClockIcon, null) },
    { id: 'discipline', label: 'Disciplina', icon: React.createElement(ContractIcon, null) },
    { id: 'stats', label: 'Stats', icon: React.createElement(ChartIcon, null) },
  ];

  const installBanner = showInstallBanner && React.createElement('div', { className: "bg-surface p-3 flex items-center justify-between gap-4 border-b border-gray-700 flex-shrink-0 z-20" },
    React.createElement('p', { className: "text-sm text-on-surface flex-grow" }, "Instala ChronoHabit en tu dispositivo para una mejor experiencia."),
    React.createElement('div', { className: "flex-shrink-0 flex gap-2" },
      React.createElement('button', { onClick: () => setShowInstallBanner(false), className: "text-xs font-semibold text-gray-400 px-3 py-1 rounded-md hover:bg-gray-700" }, "Ahora no"),
      React.createElement('button', { onClick: handleInstallClick, className: "text-xs font-bold bg-primary text-bkg px-3 py-1 rounded-md hover:bg-purple-500" }, "Instalar")
    )
  );
  
  const updateModal = showUpdateModal && React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-6" },
    React.createElement('div', { className: "bg-surface rounded-2xl p-6 w-full max-w-sm border border-primary/40 shadow-2xl" },
        React.createElement('h2', { className: "text-xl font-bold mb-3 text-on-surface" }, `¡Actualización Disponible!`),
        React.createElement('p', { className: "text-gray-300 mb-6 text-sm" },
            `Nueva versión ${APP_VERSION} lista para instalar.`
        ),
        React.createElement('div', { className: "flex flex-col gap-3" },
            React.createElement('button', 
                { 
                  onClick: handleUpdateApp,
                  className: "w-full bg-primary hover:bg-purple-500 text-bkg font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 shadow-lg"
                },
                "Actualizar Ahora"
            ),
            React.createElement('button', 
                { 
                  onClick: () => setShowUpdateModal(false),
                  className: "w-full bg-transparent hover:bg-gray-800 text-gray-400 font-semibold py-2 px-4 rounded-xl transition-colors"
                },
                "Más tarde"
            )
        )
    )
  );

  return React.createElement('div', { className: "flex flex-col min-h-screen h-[100dvh] max-w-md mx-auto bg-bkg text-on-bkg font-sans relative overflow-hidden" },
    React.createElement('header', { className: "p-4 bg-surface shadow-lg flex items-center justify-center flex-shrink-0 z-20 relative" },
      React.createElement('h1', { className: "text-2xl font-bold text-primary tracking-wider flex items-center" }, 
        "ChronoHabit",
        React.createElement(CloudIconIndicator, null)
      ),
      React.createElement('span', { className: "absolute top-2 right-2 text-[10px] text-gray-600 font-mono" }, `v${APP_VERSION}`)
    ),
    installBanner,
    React.createElement('main', { className: "flex-grow p-4 overflow-y-auto pb-28 relative z-0" },
      renderView()
    ),
    React.createElement(BottomNav, { items: navItems, currentView: currentView, setCurrentView: setCurrentView }),
    updateModal
  );
};

const App = () => (
    React.createElement(ErrorBoundary, null,
      React.createElement(TimeTrackerProvider, null,
        React.createElement(AppContent, null)
      )
    )
);

export default App;
