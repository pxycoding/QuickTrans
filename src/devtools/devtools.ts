/**
 * DevTools Page - 创建 DevTools 面板
 */
console.log('[QuickTrans DevTools] ========================================');
console.log('[QuickTrans DevTools] Initializing DevTools panel...');
console.log('[QuickTrans DevTools] Timestamp:', new Date().toISOString());
console.log('[QuickTrans DevTools] Chrome version:', navigator.userAgent);
console.log('[QuickTrans DevTools] DevTools API available:', typeof chrome.devtools !== 'undefined');
console.log('[QuickTrans DevTools] Panels API available:', typeof chrome.devtools?.panels !== 'undefined');

try {
  console.log('[QuickTrans DevTools] Creating panel with config:', {
    title: 'QuickTrans',
    iconPath: 'icons/quickTrans_48x48.png',
    pagePath: 'panel/panel.html'
  });
  
  chrome.devtools.panels.create(
    'QuickTrans',
    'icons/quickTrans_48x48.png',
    'panel/panel.html',
    (panel) => {
      if (chrome.runtime.lastError) {
        console.error('[QuickTrans DevTools] ✗ Failed to create panel:', chrome.runtime.lastError.message);
        console.error('[QuickTrans DevTools] Error details:', chrome.runtime.lastError);
      } else {
        console.log('[QuickTrans DevTools] ✓ Panel created successfully');
        console.log('[QuickTrans DevTools] Panel object:', panel);
        
        // 监听面板显示事件
        if (panel.onShown) {
          panel.onShown.addListener((window) => {
            console.log('[QuickTrans DevTools] ✓ Panel shown, window:', window);
            console.log('[QuickTrans DevTools] Panel window location:', window.location?.href);
          });
        }
        
        // 监听面板隐藏事件
        if (panel.onHidden) {
          panel.onHidden.addListener(() => {
            console.log('[QuickTrans DevTools] Panel hidden');
          });
        }
      }
    }
  );
  
  console.log('[QuickTrans DevTools] Panel creation request sent');
} catch (error) {
  console.error('[QuickTrans DevTools] ✗ Error creating panel:', error);
  console.error('[QuickTrans DevTools] Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('[QuickTrans DevTools] Error message:', error instanceof Error ? error.message : String(error));
  console.error('[QuickTrans DevTools] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
}

console.log('[QuickTrans DevTools] ========================================');

