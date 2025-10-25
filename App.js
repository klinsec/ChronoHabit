import React, { useState, useEffect } from 'react';
import { TimeTrackerProvider } from './context/TimeTrackerContext.js';
import TimerView from './components/views/TimerView.js';
import HistoryView from './components/views/HistoryView.js';
import StatsView from './components/views/StatsView.js';
import TasksView from './components/views/TasksView.js';
import BottomNav from './components/BottomNav.js';
import { ClockIcon, ListIcon, ChartIcon, ChecklistIcon } from './components/Icons.js';

const App = () => {
  const [currentView, setCurrentView] = useState('timer');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
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
    
    installPrompt.prompt();
    
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };


  const renderView = () => {
    switch (currentView) {
      case 'timer':
        return React.createElement(TimerView, null);
      case 'history':
        return React.createElement(HistoryView, null);
      case 'stats':
        return React.createElement(StatsView, null);
      case 'tasks':
        return React.createElement(TasksView, null);
      default:
        return React.createElement(TimerView, null);
    }
  };

  const navItems = [
    { id: 'timer', label: 'Cronómetro', icon: React.createElement(ClockIcon, null) },
    { id: 'history', label: 'Historial', icon: React.createElement(ListIcon, null) },
    { id: 'stats', label: 'Estadísticas', icon: React.createElement(ChartIcon, null) },
    { id: 'tasks', label: 'Tareas', icon: React.createElement(ChecklistIcon, null) },
  ];

  const installBanner = showInstallBanner && React.createElement('div', { className: "bg-surface p-3 flex items-center justify-between gap-4 border-b border-gray-700" },
    React.createElement('p', { className: "text-sm text-on-surface flex-grow" }, "Instala ChronoHabit en tu dispositivo para una mejor experiencia."),
    React.createElement('div', { className: "flex-shrink-0 flex gap-2" },
      React.createElement('button', { onClick: () => setShowInstallBanner(false), className: "text-xs font-semibold text-gray-400 px-3 py-1 rounded-md hover:bg-gray-700" }, "Ahora no"),
      React.createElement('button', { onClick: handleInstallClick, className: "text-xs font-bold bg-primary text-bkg px-3 py-1 rounded-md hover:bg-purple-500" }, "Instalar")
    )
  );


  return (
    React.createElement(TimeTrackerProvider, null,
      React.createElement('div', { className: "flex flex-col h-screen max-w-md mx-auto bg-bkg font-sans" },
        React.createElement('header', { className: "p-4 bg-surface shadow-lg flex items-center justify-center" },
          React.createElement('h1', { className: "text-2xl font-bold text-primary tracking-wider" }, "ChronoHabit")
        ),
        installBanner,
        React.createElement('main', { className: "flex-grow p-4 overflow-y-auto pb-28" },
          renderView()
        ),
        React.createElement(BottomNav, { items: navItems, currentView: currentView, setCurrentView: setCurrentView })
      )
    )
  );
};

export default App;
