import React from 'react';
import { createRoot } from 'react-dom/client';
import { initI18n } from '../../i18n/config';
import NetworkPanel from './NetworkPanel';
import './panel.css';

// 初始化 i18n
initI18n().then(() => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container not found');
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <NetworkPanel locale="zh" />
    </React.StrictMode>
  );
}).catch(err => {
  console.error('Failed to initialize DevTools panel:', err);
});

