import { MessageListener } from '../utils/message';
import { MessageType } from '../types';
import { initI18n, getLocale, getTranslations } from '../i18n/config';

// 初始化 i18next
initI18n();

// 初始化消息监听器
const messageListener = new MessageListener();

// 注册消息处理器
messageListener.on(MessageType.DETECT_CONTENT, async (_payload: unknown) => {
  // 内容检测在content script中完成
  return { success: true };
});

messageListener.on(MessageType.CONVERT_TIMESTAMP, async (_payload: unknown) => {
  // 时间戳转换在content script中完成
  return { success: true };
});

messageListener.on(MessageType.GENERATE_QRCODE, async (_payload: unknown) => {
  // 二维码生成在content script中完成
  return { success: true };
});

messageListener.on(MessageType.DECODE_QRCODE, async (_payload: unknown) => {
  // 二维码解码在content script中完成
  return { success: true };
});

// 启动监听
messageListener.start();

// 监听存储变化，用于跨标签页同步
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // 监听活动窗口列表变化
    if (changes.activeWindows) {
      // 广播同步消息到所有标签页
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SYNC_WINDOWS',
              payload: {}
            }).catch(() => {
              // 忽略错误（可能是content script还未加载）
            });
          }
        });
      });
    }
    
    // 监听窗口状态变化（最小化/展开）
    for (const key in changes) {
      if (key.startsWith('qrCodeWindowState_')) {
        // 窗口状态变化会通过activeWindows同步自动处理
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.id) {
              chrome.tabs.sendMessage(tab.id, {
                type: 'SYNC_WINDOWS',
                payload: {}
              }).catch(() => {
                // 忽略错误
              });
            }
          });
        });
        break;
      }
    }
  }
});

// 同步所有活动窗口到指定tab
const syncWindowsToTab = (tabId: number) => {
  chrome.storage.local.get(['activeWindows'], (result) => {
    const activeWindows = result.activeWindows || [];
    if (activeWindows.length > 0) {
      // 发送同步消息到content script
      chrome.tabs.sendMessage(tabId, {
        type: 'SYNC_WINDOWS',
        payload: {}
      }).catch(() => {
        // 忽略错误（可能是content script还未加载）
      });
    }
  });
};

// 监听标签页创建事件
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    // 等待content script加载后再同步
    setTimeout(() => {
      syncWindowsToTab(tab.id!);
    }, 500);
  }
});

// 监听标签页更新事件（页面加载完成时）
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    // 同步所有活动窗口
    syncWindowsToTab(tabId);
  }
});

// 监听标签页激活事件（切换tab时）
chrome.tabs.onActivated.addListener((activeInfo) => {
  // 同步所有活动窗口到新激活的tab
  syncWindowsToTab(activeInfo.tabId);
});

// 创建右键菜单
chrome.runtime.onInstalled.addListener(async () => {
  const locale = getLocale();
  const translations = getTranslations(locale);
  
  // 二维码识别菜单
  chrome.contextMenus.create({
    id: 'decode-qrcode',
    title: translations.contextMenu.decodeQRCode,
    contexts: ['image']
  });
  
  // 时间戳转换菜单
  chrome.contextMenus.create({
    id: 'convert-timestamp',
    title: translations.contextMenu.convertTimestamp,
    contexts: ['selection']
  });
  
  // 生成二维码菜单
  chrome.contextMenus.create({
    id: 'generate-qrcode',
    title: translations.contextMenu.generateQRCode,
    contexts: ['selection']
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'decode-qrcode' && info.srcUrl && tab?.id) {
    // 发送消息到content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'DECODE_QRCODE',
        payload: {
          imageUrl: info.srcUrl
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  } else if ((info.menuItemId === 'convert-timestamp' || info.menuItemId === 'generate-qrcode') && info.selectionText && tab?.id) {
    // 发送消息到content script进行类型检测和处理
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: info.menuItemId === 'convert-timestamp' ? 'CONVERT_TIMESTAMP' : 'GENERATE_QRCODE',
        payload: {
          selectionText: info.selectionText
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
});

// 监听选中文本变化，用于动态更新右键菜单
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'UPDATE_CONTEXT_MENU' && sender.tab) {
    const { isTimestamp, isURL } = message.payload;
    console.log('[Background] 更新右键菜单:', { isTimestamp, isURL });
    
    // 根据内容类型更新菜单可见性
    if (isTimestamp) {
      // 检测到时间戳，只显示转换菜单
      chrome.contextMenus.update('convert-timestamp', { visible: true });
      chrome.contextMenus.update('generate-qrcode', { visible: false });
    } else if (isURL) {
      // 检测到URL，只显示二维码生成菜单
      chrome.contextMenus.update('convert-timestamp', { visible: false });
      chrome.contextMenus.update('generate-qrcode', { visible: true });
    } else {
      // 未检测到特定类型，显示所有菜单
      chrome.contextMenus.update('convert-timestamp', { visible: true });
      chrome.contextMenus.update('generate-qrcode', { visible: true });
    }
    
    sendResponse({ success: true });
  } else if (message.type === 'UPDATE_CONTEXT_MENU_LOCALE') {
    // 更新右键菜单语言
    const { locale } = message.payload;
    // 确保 i18n 已初始化
    await initI18n();
    const translations = getTranslations(locale);
    
    try {
      chrome.contextMenus.update('decode-qrcode', { title: translations.contextMenu.decodeQRCode });
      chrome.contextMenus.update('convert-timestamp', { title: translations.contextMenu.convertTimestamp });
      chrome.contextMenus.update('generate-qrcode', { title: translations.contextMenu.generateQRCode });
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Background] 更新右键菜单语言失败:', error);
      sendResponse({ success: false });
    }
  }
  return true;
});

console.log('QA Booster Background Service Worker loaded');

