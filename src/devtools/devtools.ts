/**
 * DevTools Page - 创建 DevTools 面板
 */
console.log('[QuickTrans DevTools] Initializing...');

try {
  chrome.devtools.panels.create(
    'QuickTrans',
    'icons/quickTrans_48x48.png',
    'panel/panel.html',
    (panel) => {
      if (chrome.runtime.lastError) {
        console.error('[QuickTrans DevTools] Failed to create panel:', chrome.runtime.lastError.message);
      } else {
        console.log('[QuickTrans DevTools] Panel created successfully');
        console.log('[QuickTrans DevTools] Panel object:', panel);
      }
    }
  );
} catch (error) {
  console.error('[QuickTrans DevTools] Error creating panel:', error);
}

