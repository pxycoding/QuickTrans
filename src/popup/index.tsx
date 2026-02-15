import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initI18n } from '../i18n/config';
import './index.css';

console.log('[QuickTrans Popup] Starting initialization...');
console.log('[QuickTrans Popup] Current URL:', window.location.href);
console.log('[QuickTrans Popup] Document ready state:', document.readyState);

// 检查样式表加载情况
const checkStylesheets = () => {
  const stylesheets = Array.from(document.styleSheets);
  console.log('[QuickTrans Popup] Loaded stylesheets:', stylesheets.length);
  stylesheets.forEach((sheet, index) => {
    try {
      console.log(`[QuickTrans Popup] Stylesheet ${index}:`, sheet.href || 'inline', sheet.cssRules?.length || 0, 'rules');
    } catch (e) {
      console.warn(`[QuickTrans Popup] Cannot access stylesheet ${index}:`, e instanceof Error ? e.message : String(e));
    }
  });
};

// 初始化 i18next
initI18n()
  .then(() => {
    console.log('[QuickTrans Popup] i18n initialized successfully');
    
    const container = document.getElementById('root');
    if (!container) {
      console.error('[QuickTrans Popup] ✗ Root container not found!');
      throw new Error('Root container not found');
    }
    
    console.log('[QuickTrans Popup] ✓ Root container found:', container);
    console.log('[QuickTrans Popup] Container computed styles:', {
      backgroundColor: window.getComputedStyle(container).backgroundColor,
      color: window.getComputedStyle(container).color,
      fontSize: window.getComputedStyle(container).fontSize,
      fontFamily: window.getComputedStyle(container).fontFamily,
      width: window.getComputedStyle(container).width,
      height: window.getComputedStyle(container).height
    });

    // 延迟检查样式表，确保所有样式都已加载
    setTimeout(() => {
      checkStylesheets();
      // 再次检查，确保所有 CSS 文件都已加载
      setTimeout(() => {
        console.log('[QuickTrans Popup] Final stylesheet check:');
        checkStylesheets();
      }, 500);
    }, 100);

    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('[QuickTrans Popup] ✓ React component rendered successfully');
  })
  .catch(err => {
    console.error('[QuickTrans Popup] ✗ Failed to initialize popup:', err);
    console.error('[QuickTrans Popup] Error name:', err instanceof Error ? err.name : 'Unknown');
    console.error('[QuickTrans Popup] Error message:', err instanceof Error ? err.message : String(err));
    console.error('[QuickTrans Popup] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    
    // 显示错误信息给用户
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: #ff3b30; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <h2>初始化失败</h2>
          <p>${err instanceof Error ? err.message : String(err)}</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">请查看控制台获取更多信息</p>
        </div>
      `;
    }
  });

