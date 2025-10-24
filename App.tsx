import React, { useState } from 'react';
import { TimeTrackerProvider } from './context/TimeTrackerContext';
import TimerView from './components/views/TimerView';
import HistoryView from './components/views/HistoryView';
import StatsView from './components/views/StatsView';
import BottomNav from './components/BottomNav';
import { ClockIcon, ListIcon, ChartIcon } from './components/Icons';

type View = 'timer' | 'history' | 'stats';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('timer');

  const renderView = () => {
    switch (currentView) {
      case 'timer':
        return <TimerView />;
      case 'history':
        return <HistoryView />;
      case 'stats':
        return <StatsView />;
      default:
        return <TimerView />;
    }
  };

  const navItems = [
    { id: 'timer' as View, label: 'Cronómetro', icon: <ClockIcon /> },
    { id: 'history' as View, label: 'Historial', icon: <ListIcon /> },
    { id: 'stats' as View, label: 'Estadísticas', icon: <ChartIcon /> },
  ];

  return (
    <TimeTrackerProvider>
      <div className="flex flex-col h-screen max-w-md mx-auto bg-bkg font-sans">
        <header className="p-4 text-center bg-surface shadow-lg">
          <h1 className="text-2xl font-bold text-primary tracking-wider">ChronoHabit</h1>
        </header>
        <main className="flex-grow p-4 overflow-y-auto pb-28">
          {renderView()}
        </main>
        <BottomNav items={navItems} currentView={currentView} setCurrentView={setCurrentView} />
      </div>
    </TimeTrackerProvider>
  );
};

export default App;