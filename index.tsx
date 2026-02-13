import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import sdk from '@farcaster/frame-sdk';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Initialize Farcaster Frame SDK to signal the app is ready
sdk.actions.ready();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);