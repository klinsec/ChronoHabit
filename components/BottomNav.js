import React from 'react';

const BottomNav = ({ items, currentView, setCurrentView }) => {
  return (
    React.createElement('nav', { className: "fixed bottom-0 left-0 right-0 bg-surface shadow-t-lg z-10 border-t border-gray-800" },
      React.createElement('div', { className: "flex justify-around items-center h-24 max-w-md mx-auto px-4" },
        items.map((item) => (
          React.createElement('button',
            {
              key: item.id,
              onClick: () => setCurrentView(item.id),
              className: `flex flex-col items-center justify-center w-full h-full pt-3 transition-all duration-300 ease-in-out focus:outline-none ${
                currentView === item.id ? 'text-primary' : 'text-gray-400 hover:text-secondary'
              }`,
              'aria-current': currentView === item.id ? 'page' : undefined
            },
            React.createElement('div', { className: `transition-transform duration-300 ease-in-out ${currentView === item.id ? 'transform -translate-y-2 scale-110' : ''}` },
              React.createElement('div', { className: "w-8 h-8" }, item.icon)
            ),
            React.createElement('span', { className: `text-sm mt-2 transition-opacity duration-300 ${currentView === item.id ? 'font-bold opacity-100' : 'opacity-90'}` }, item.label)
          )
        ))
      )
    )
  );
};

export default BottomNav;
