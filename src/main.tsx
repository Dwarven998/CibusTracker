import React from 'react';
import ReactDOM from 'react-dom/client';
import { installStandaloneApiInterceptor } from './services/clientStandaloneEngine';
import App from './App';
import './index.css';

// Enable automatic client-side API & simulation fallback when deployed to static/serverless hosts like Vercel
installStandaloneApiInterceptor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
