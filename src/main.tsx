
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const ROOT_ID = 'root';
let container = document.getElementById(ROOT_ID);

if (!container) {
  container = document.createElement('div');
  container.id = ROOT_ID;
  document.body.appendChild(container);
}

const ROOT_KEY = '__chronohabit_root__';
let root = (window as any)[ROOT_KEY];

if (!root) {
  try {
    root = ReactDOM.createRoot(container);
    (window as any)[ROOT_KEY] = root;
  } catch (e) {
    console.warn("Root creation failed, likely due to HMR. Recreating container...", e);
    
    // Create a fresh container to bypass the "container already has a root" error
    const newContainer = document.createElement('div');
    newContainer.id = ROOT_ID;
    
    // Replace the old container in the DOM
    if (container.parentNode) {
      container.parentNode.replaceChild(newContainer, container);
    } else {
      document.body.appendChild(newContainer);
    }
    
    // Try creating root on the fresh container
    root = ReactDOM.createRoot(newContainer);
    (window as any)[ROOT_KEY] = root;
  }
}

if (root) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
