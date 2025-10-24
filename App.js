import React, { useState } from 'react';
import { TimeTrackerProvider } from './context/TimeTrackerContext.js';
import TimerView from './components/views/TimerView.js';
import HistoryView from './components/views/HistoryView.js';
import StatsView from './components/views/StatsView.js';
import BottomNav from './components/BottomNav.js';
import { ClockIcon, ListIcon, ChartIcon } from './components/Icons.js';

const App = () => {
  const [currentView, setCurrentView] = useState('timer');

  const renderView = () => {
    switch (currentView) {
      case 'timer':
        return React.createElement(TimerView, null);
      case 'history':
        return React.createElement(HistoryView, null);
      case 'stats':
        return React.createElement(StatsView, null);
      default:
        return React.createElement(TimerView, null);
    }
  };

  const navItems = [
    { id: 'timer', label: 'Cronómetro', icon: React.createElement(ClockIcon, null) },
    { id: 'history', label: 'Historial', icon: React.createElement(ListIcon, null) },
    { id: 'stats', label: 'Estadísticas', icon: React.createElement(ChartIcon, null) },
  ];

  return (
    React.createElement(TimeTrackerProvider, null,
      React.createElement('div', { className: "flex flex-col h-screen max-w-md mx-auto bg-bkg font-sans" },
        React.createElement('header', { className: "p-4 text-center bg-surface shadow-lg" },
          React.createElement('h1', { className: "text-2xl font-bold text-primary tracking-wider" }, "ChronoHabit")
        ),
        React.createElement('main', { className: "flex-grow p-4 overflow-y-auto pb-28" },
          renderView()
        ),
        React.createElement(BottomNav, { items: navItems, currentView: currentView, setCurrentView: setCurrentView })
      )
    )
  );
};

export default App;
