import { SelectionMonitor } from './SelectionMonitor';
import { FloatWindowManager } from './FloatWindowManager';
import { ContentType } from '../types';
import { initI18n, t } from '../i18n/config';
import './styles.css';

// 初始化 i18next
initI18n();

// 初始化选择监听器（构造函数会注册事件监听器）
console.log('[QA Booster] 初始化 SelectionMonitor...');
new SelectionMonitor();

// 初始化悬浮窗管理器
console.log('[QA Booster] 初始化 FloatWindowManager...');
const floatWindowManager = new FloatWindowManager();

// 监听storage变化，实现跨tab同步
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // 检查是否有新的活动窗口
    if (changes.activeWindows) {
      const newWindows = changes.activeWindows.newValue || [];
      const oldWindows = changes.activeWindows.oldValue || [];
      
      // 找出新增的窗口
      const addedWindows = newWindows.filter((id: string) => !oldWindows.includes(id));
      
      // 找出被移除的窗口
      const removedWindows = oldWindows.filter((id: string) => !newWindows.includes(id));
      
      // 移除已关闭的窗口
      for (const windowId of removedWindows) {
        floatWindowManager.close(windowId);
      }
      
      // 添加新窗口
      for (const windowId of addedWindows) {
        const dataKey = `qrCodeWindowData_${windowId}`;
        const stateKey = `qrCodeWindowState_${windowId}`;
        chrome.storage.local.get([dataKey, stateKey], (data) => {
          const windowData = data[dataKey];
          const windowState = data[stateKey];
          if (windowData) {
            const { url, imageUrl } = windowData;
            const minimized = windowState?.minimized || false;
            const existingWindows = floatWindowManager.getActiveWindows();
            
            // 如果窗口不存在，则创建
            if (!existingWindows.includes(windowId)) {
              if (url) {
                floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId).catch(console.error);
              } else if (imageUrl) {
                floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId).catch(console.error);
              }
            }
          }
        });
      }
    }
    
    // 监听窗口状态变化（最小化/展开）
    for (const key in changes) {
      if (key.startsWith('qrCodeWindowState_')) {
        const windowId = key.replace('qrCodeWindowState_', '');
        const newState = changes[key].newValue;
        if (newState && newState.minimized !== undefined) {
          // 状态变化会通过React组件自动处理，这里只需要确保窗口存在
          syncAllWindows();
        }
      }
      
      // 监听窗口位置变化
      if (key.startsWith('floatWindowPosition_')) {
        // 位置变化会通过React组件自动处理
      }
    }
  }
});

// 同步所有活动窗口的函数
const syncAllWindows = () => {
  chrome.storage.local.get(['activeWindows'], (result) => {
    const activeWindows = result.activeWindows || [];
    if (activeWindows.length > 0) {
      console.log('[QA Booster] 同步窗口:', activeWindows);
      
      for (const windowId of activeWindows) {
        const dataKey = `qrCodeWindowData_${windowId}`;
        const stateKey = `qrCodeWindowState_${windowId}`;
        const positionKey = `floatWindowPosition_${windowId}`;
        
        chrome.storage.local.get([dataKey, stateKey, positionKey], (data) => {
          const windowData = data[dataKey];
          const windowState = data[stateKey];
          
          if (windowData) {
            const { url, imageUrl } = windowData;
            const minimized = windowState?.minimized || false;
            
            const existingWindows = floatWindowManager.getActiveWindows();
            if (!existingWindows.includes(windowId)) {
              if (url) {
                floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId).catch(console.error);
              } else if (imageUrl) {
                floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId).catch(console.error);
              }
            }
          }
        });
      }
    }
  });
};

// 页面加载时同步所有窗口
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAllWindows);
} else {
  syncAllWindows();
}

// 当tab变为可见时同步窗口（切换tab时）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('[QA Booster] Tab变为可见，同步窗口');
    syncAllWindows();
  }
});

// 窗口获得焦点时同步（切换回浏览器时）
window.addEventListener('focus', () => {
  console.log('[QA Booster] 窗口获得焦点，同步窗口');
  syncAllWindows();
});

// 监听操作事件
console.log('[QA Booster] 注册 qa-booster-action 事件监听器...');
window.addEventListener('qa-booster-action', ((e: CustomEvent) => {
  let { type, value, result } = e.detail;
  
  // 防御性编程：如果 value 为空，尝试从 result 中获取
  if (!value && result && result.value) {
    console.warn('[QA Booster] value 为空，从 result.value 恢复:', result.value);
    value = result.value;
  }

  console.log('[QA Booster] 收到操作事件:', { type, value });

  if (!value) {
    console.error('[QA Booster] ❌ 无法获取有效的内容值');
    return;
  }

  if (type === ContentType.TIMESTAMP_SECOND ||
      type === ContentType.TIMESTAMP_MILLISECOND ||
      type === ContentType.DATETIME) {
    console.log('[QA Booster] 显示时间戳转换面板');
    floatWindowManager.showTimestampPanel(value, type).catch(console.error);
  } else if (type === ContentType.URL) {
    console.log('[QA Booster] 显示二维码生成面板');
    floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, value).catch(console.error);
  } else {
    console.warn('[QA Booster] 未知的内容类型:', type);
  }
}) as EventListener);

// 监听右键菜单事件（二维码识别和时间戳转换）
console.log('[QA Booster] 注册 Chrome 消息监听器...');
if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[QA Booster] 收到 Chrome 消息:', message);
  
  if (message.type === 'DETECT_CONTENT_TYPE') {
    // 检测内容类型（用于动态显示右键菜单）
    const { selectionText } = message.payload;
    console.log('[QA Booster] 检测内容类型:', { selectionText });
    
    import('../converters/ContentDetector').then(({ ContentDetector }) => {
      const detectionResult = ContentDetector.detect(selectionText);
      const isTimestamp = detectionResult.type === ContentType.TIMESTAMP_SECOND || 
                         detectionResult.type === ContentType.TIMESTAMP_MILLISECOND ||
                         detectionResult.type === ContentType.DATETIME;
      const isURL = detectionResult.type === ContentType.URL;
      
      console.log('[QA Booster] 内容类型检测结果:', {
        type: detectionResult.type,
        isTimestamp,
        isURL
      });
      
      sendResponse({ isTimestamp, isURL });
    }).catch(error => {
      console.error('[QA Booster] 检测内容类型时出错:', error);
      sendResponse({ isTimestamp: false, isURL: false });
    });
    
    // 返回true表示异步处理
    return true;
  } else if (message.type === 'DECODE_QRCODE') {
    const { imageUrl, imageFile } = message.payload;
    console.log('[QA Booster] 显示二维码识别面板:', { imageUrl, imageFile });
    floatWindowManager.showQRCodeDecoderPanel(imageUrl, imageFile).catch(console.error);
    sendResponse({ success: true });
  } else if (message.type === 'CONVERT_TIMESTAMP') {
    const { selectionText } = message.payload;
    console.log('[QA Booster] 处理时间戳转换请求:', { selectionText });
    
    // 检测选择的文本类型
    import('../converters/ContentDetector').then(({ ContentDetector }) => {
      const detectionResult = ContentDetector.detect(selectionText);
      
      if (detectionResult.type === ContentType.UNKNOWN || detectionResult.confidence < 0.5) {
        console.warn('[QA Booster] 无法识别的时间戳格式:', selectionText);
        sendResponse({ success: false, error: t('errors.unrecognizedTimestamp') });
      } else {
        console.log('[QA Booster] 显示时间戳转换面板:', { value: selectionText, type: detectionResult.type });
        floatWindowManager.showTimestampPanel(selectionText, detectionResult.type).catch(console.error);
        sendResponse({ success: true });
      }
    }).catch(error => {
      console.error('[QA Booster] 处理时间戳转换时出错:', error);
      sendResponse({ success: false, error: t('errors.timestampConversionError') });
    });
    
    // 返回true表示异步处理
    return true;
  } else if (message.type === 'GENERATE_QRCODE') {
    const { selectionText } = message.payload;
    console.log('[QA Booster] 处理生成二维码请求:', { selectionText });
    
    // 检测选择的文本类型
      import('../converters/ContentDetector').then(({ ContentDetector }) => {
        const detectionResult = ContentDetector.detect(selectionText);
        
        // 二维码可以处理URL和其他文本内容
        if (detectionResult.type === ContentType.URL || detectionResult.type === ContentType.UNKNOWN) {
          console.log('[QA Booster] 显示二维码生成面板:', { value: selectionText });
          floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, selectionText).catch(console.error);
          sendResponse({ success: true });
        } else {
          console.warn('[QA Booster] 无法生成二维码的内容类型:', selectionText);
          sendResponse({ success: false, error: t('errors.unrecognizedQRCodeContent') });
        }
      }).catch(error => {
        console.error('[QA Booster] 处理生成二维码时出错:', error);
        sendResponse({ success: false, error: t('errors.qrcodeGenerationError') });
      });
    
    // 返回true表示异步处理
    return true;
  } else if (message.type === 'SYNC_WINDOWS') {
    // 跨tab同步所有窗口
    console.log('[QA Booster] 同步窗口状态');
    
    chrome.storage.local.get(['activeWindows'], async (result) => {
      const activeWindows = result.activeWindows || [];
      console.log('[QA Booster] 活动窗口列表:', activeWindows);
      
      for (const windowId of activeWindows) {
        const dataKey = `qrCodeWindowData_${windowId}`;
        const stateKey = `qrCodeWindowState_${windowId}`;
        
        chrome.storage.local.get([dataKey, stateKey], (data) => {
          const windowData = data[dataKey];
          const windowState = data[stateKey];
          
          if (windowData) {
            const { url, imageUrl } = windowData;
            const minimized = windowState?.minimized || false;
            
            // 检查窗口是否已存在
            const existingWindows = floatWindowManager.getActiveWindows();
            if (!existingWindows.includes(windowId)) {
              if (url) {
                floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId).catch(console.error);
              } else if (imageUrl) {
                floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId).catch(console.error);
              }
            }
          }
        });
      }
    });
    
    sendResponse({ success: true });
  }
  return true;
  });
} else {
  console.warn('[QA Booster] Chrome runtime 不可用，无法注册消息监听器');
}

console.log('[QA Booster] ✅ Content Script 加载完成');

