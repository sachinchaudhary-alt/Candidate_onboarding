import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './index.css';
import './styles/ta.css';
import './styles/home.css';

/* Dev/demo: ?as=ta|hr|candidate seeds the role before first render. */
try {
  const as = new URLSearchParams(window.location.search).get('as');
  if (['ta', 'hr', 'candidate'].includes(as)) {
    localStorage.setItem('talentflow.role.v3', JSON.stringify(as));
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
