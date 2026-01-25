import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initI18n } from '../i18n/config';
import './index.css';

// 初始化 i18next
initI18n().then(() => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});

