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

/** 获取当前 tab id（缓存），用于按 tab 记录/恢复悬浮窗 */
let cachedTabId: number | null = null;
function getTabId(): Promise<number | null> {
  if (cachedTabId != null) return Promise.resolve(cachedTabId);
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (res: { tabId?: number } | undefined) => {
      const id = res?.tabId ?? null;
      if (id != null) cachedTabId = id;
      resolve(id);
    });
  });
}

// 当前 tab 刷新后恢复之前打开的悬浮窗（仅恢复本 tab）
function restoreTabWindowsOnLoad() {
  getTabId().then((tabId) => {
    if (tabId != null) {
      floatWindowManager.restoreTabWindows(tabId).catch(console.error);
    }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreTabWindowsOnLoad);
} else {
  restoreTabWindowsOnLoad();
}

// [已禁用] 在别的 tab 里恢复悬浮窗：监听 storage 变化实现跨 tab 同步
// chrome.storage.onChanged.addListener((changes, namespace) => {
//   if (namespace === 'local') {
//     if (changes.activeWindows) {
//       const newWindows = changes.activeWindows.newValue || [];
//       const oldWindows = changes.activeWindows.oldValue || [];
//       const addedWindows = newWindows.filter((id: string) => !oldWindows.includes(id));
//       const removedWindows = oldWindows.filter((id: string) => !newWindows.includes(id));
//       for (const windowId of removedWindows) {
//         floatWindowManager.close(windowId);
//       }
//       for (const windowId of addedWindows) {
//         const dataKey = `qrCodeWindowData_${windowId}`;
//         const stateKey = `qrCodeWindowState_${windowId}`;
//         chrome.storage.local.get([dataKey, stateKey], (data) => {
//           const windowData = data[dataKey];
//           const windowState = data[stateKey];
//           if (windowData) {
//             const { url, imageUrl } = windowData;
//             const minimized = windowState?.minimized || false;
//             const existingWindows = floatWindowManager.getActiveWindows();
//             if (!existingWindows.includes(windowId)) {
//               if (url) {
//                 floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId, !imageUrl).catch(console.error);
//               } else if (imageUrl) {
//                 floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId, false).catch(console.error);
//               }
//             }
//           }
//         });
//       }
//     }
//     for (const key in changes) {
//       if (key.startsWith('qrCodeWindowState_')) {
//         const newState = changes[key].newValue;
//         if (newState && newState.minimized !== undefined) {
//           syncAllWindows();
//         }
//       }
//     }
//   }
// });

// [已禁用] 在别的 tab 里恢复悬浮窗：同步所有活动窗口到当前 tab
// const syncAllWindows = () => {
//   chrome.storage.local.get(['activeWindows'], (result) => {
//     const activeWindows = result.activeWindows || [];
//     if (activeWindows.length > 0) {
//       for (const windowId of activeWindows) {
//         const dataKey = `qrCodeWindowData_${windowId}`;
//         const stateKey = `qrCodeWindowState_${windowId}`;
//         const positionKey = `floatWindowPosition_${windowId}`;
//         chrome.storage.local.get([dataKey, stateKey, positionKey], (data) => {
//           const windowData = data[dataKey];
//           const windowState = data[stateKey];
//           if (windowData) {
//             const { url, imageUrl } = windowData;
//             const minimized = windowState?.minimized || false;
//             const existingWindows = floatWindowManager.getActiveWindows();
//             if (!existingWindows.includes(windowId)) {
//               if (url) {
//                 floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId).catch(console.error);
//               } else if (imageUrl) {
//                 floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId).catch(console.error);
//               }
//             }
//           }
//         });
//       }
//     }
//   });
// };

// [已禁用] 页面加载时同步所有窗口
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', syncAllWindows);
// } else {
//   syncAllWindows();
// }

// [已禁用] 当 tab 变为可见时同步窗口（切换 tab 时）
// document.addEventListener('visibilitychange', () => {
//   if (!document.hidden) {
//     syncAllWindows();
//   }
// });

// [已禁用] 窗口获得焦点时同步（切换回浏览器时）
// window.addEventListener('focus', () => {
//   syncAllWindows();
// });

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
    getTabId().then((tabId) =>
      floatWindowManager.showTimestampPanel(value, type, false, undefined, tabId ?? undefined)
    ).catch(console.error);
  } else if (type === ContentType.URL) {
    console.log('[QA Booster] 显示二维码生成面板');
    getTabId().then((tabId) =>
      floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, value, false, undefined, true, tabId ?? undefined)
    ).catch(console.error);
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
    getTabId().then((tabId) =>
      floatWindowManager.showQRCodeDecoderPanel(imageUrl, imageFile, undefined, false, undefined, false, tabId ?? undefined)
    ).catch(console.error);
    sendResponse({ success: true });
  } else if (message.type === 'CONVERT_TIMESTAMP') {
    const { selectionText } = message.payload;
    console.log('[QA Booster] 处理时间戳转换请求:', { selectionText });
    
    // 如果为空，直接打开面板让用户输入
    if (!selectionText || !selectionText.trim()) {
      console.log('[QA Booster] 打开空的时间戳转换面板，让用户输入');
      getTabId().then((tabId) =>
        floatWindowManager.showTimestampPanel('', ContentType.UNKNOWN, false, undefined, tabId ?? undefined)
      ).catch(console.error);
      sendResponse({ success: true });
      return true;
    }
    
    // 检测选择的文本类型
    import('../converters/ContentDetector').then(({ ContentDetector }) => {
      const detectionResult = ContentDetector.detect(selectionText);
      
      if (detectionResult.type === ContentType.UNKNOWN || detectionResult.confidence < 0.5) {
        console.warn('[QA Booster] 无法识别的时间戳格式:', selectionText);
        sendResponse({ success: false, error: t('errors.unrecognizedTimestamp') });
      } else {
        console.log('[QA Booster] 显示时间戳转换面板:', { value: selectionText, type: detectionResult.type });
        getTabId().then((tabId) =>
          floatWindowManager.showTimestampPanel(selectionText, detectionResult.type, false, undefined, tabId ?? undefined)
        ).catch(console.error);
        sendResponse({ success: true });
      }
    }).catch(error => {
      console.error('[QA Booster] 处理时间戳转换时出错:', error);
      sendResponse({ success: false, error: t('errors.timestampConversionError') });
    });
    
    // 返回true表示异步处理
    return true;
  } else if (message.type === 'GENERATE_QRCODE') {
    const { selectionText, source } = message.payload;
    console.log('[QA Booster] 处理生成二维码请求:', { selectionText, source });
    
    // 判断是否从 popup 进入（显示模式切换按钮）
    const showModeSwitcher = source === 'popup';
    
    // 如果为空，直接打开面板让用户输入
    if (!selectionText || !selectionText.trim()) {
      console.log('[QA Booster] 打开空的二维码生成面板，让用户输入');
      getTabId().then((tabId) =>
        floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, '', false, undefined, showModeSwitcher, tabId ?? undefined)
      ).catch(console.error);
      sendResponse({ success: true });
      return true;
    }
    
    // 检测选择的文本类型
      import('../converters/ContentDetector').then(({ ContentDetector }) => {
        const detectionResult = ContentDetector.detect(selectionText);
        
        // 二维码可以处理URL和其他文本内容
        if (detectionResult.type === ContentType.URL || detectionResult.type === ContentType.UNKNOWN) {
          console.log('[QA Booster] 显示二维码生成面板:', { value: selectionText });
          getTabId().then((tabId) =>
            floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, selectionText, false, undefined, showModeSwitcher, tabId ?? undefined)
          ).catch(console.error);
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
  }
  // [已禁用] 在别的 tab 里恢复悬浮窗：响应 background 的 SYNC_WINDOWS 消息
  // else if (message.type === 'SYNC_WINDOWS') {
  //   chrome.storage.local.get(['activeWindows'], async (result) => {
  //     const activeWindows = result.activeWindows || [];
  //     for (const windowId of activeWindows) {
  //       const dataKey = `qrCodeWindowData_${windowId}`;
  //       const stateKey = `qrCodeWindowState_${windowId}`;
  //       chrome.storage.local.get([dataKey, stateKey], (data) => {
  //         const windowData = data[dataKey];
  //         const windowState = data[stateKey];
  //         if (windowData) {
  //           const { url, imageUrl } = windowData;
  //           const minimized = windowState?.minimized || false;
  //           const existingWindows = floatWindowManager.getActiveWindows();
  //           if (!existingWindows.includes(windowId)) {
  //             if (url) {
  //               floatWindowManager.showQRCodeDecoderPanel(undefined, undefined, url, minimized, windowId, !imageUrl).catch(console.error);
  //             } else if (imageUrl) {
  //               floatWindowManager.showQRCodeDecoderPanel(imageUrl, undefined, url, minimized, windowId, false).catch(console.error);
  //             }
  //           }
  //         }
  //       });
  //     }
  //   });
  //   sendResponse({ success: true });
  //   return true;
  // }
  return true;
  });
} else {
  console.warn('[QA Booster] Chrome runtime 不可用，无法注册消息监听器');
}

console.log('[QA Booster] ✅ Content Script 加载完成');

