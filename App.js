
import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider, useTimeTracker } from './context/TimeTrackerContext.js';
import TimerView from './components/views/TimerView.js';
import HistoryView from './components/views/HistoryView.js';
import StatsView from './components/views/StatsView.js';
import TasksView from './components/views/TasksView.js';
import BottomNav from './components/BottomNav.js';
import { ClockIcon, ListIcon, ChartIcon, ChecklistIcon } from './components/Icons.js';
import ErrorBoundary from './components/ErrorBoundary.js';

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
  const [currentView, setCurrentView] = useState('timer');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
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
           console.warn('Service Worker getRegistration failed (likely environment restriction):', err);
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
      case 'timer': return React.createElement(TimerView, null);
      case 'history': return React.createElement(HistoryView, null);
      case 'stats': return React.createElement(StatsView, null);
      case 'tasks': return React.createElement(TasksView, null);
      default: return React.createElement(TimerView, null);
    }
  };

  const navItems = [
    { id: 'timer', label: 'Cronómetro', icon: React.createElement(ClockIcon, null) },
    { id: 'history', label: 'Historial', icon: React.createElement(ListIcon, null) },
    { id: 'stats', label: 'Estadísticas', icon: React.createElement(ChartIcon, null) },
    { id: 'tasks', label: 'Tareas', icon: React.createElement(ChecklistIcon, null) },
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
        React.createElement('h2', { className: "text-xl font-bold mb-3 text-on-surface" }, "¡Actualización Disponible!"),
        React.createElement('p', { className: "text-gray-300 mb-6 text-sm" },
            "Hay una nueva versión de ChronoHabit lista para usar. Actualiza ahora para obtener las últimas funciones y mejoras. Tus datos están seguros."
        ),
        React.createElement('div', { className: "flex flex-col gap-3" },
            React.createElement('button', 
                { 
                  onClick: handleUpdateApp,
                  className: "w-full bg-primary hover:bg-purple-500 text-bkg font-bold py-3 px-4 rounded-xl transition-transform active:scale-95 shadow-lg"
                },
                "Actualizar ahora"
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
    React.createElement('header', { className: "p-4 bg-surface shadow-lg flex items-center justify-center flex-shrink-0 z-20" },
      React.createElement('h1', { className: "text-2xl font-bold text-primary tracking-wider flex items-center" }, 
        "ChronoHabit",
        React.createElement(CloudIconIndicator, null)
      )
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
