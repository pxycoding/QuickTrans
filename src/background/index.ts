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
// 注意：移除了 chrome.tabs.query({}) 的使用，改为依赖 content script 自己监听 storage 变化
// 这样不需要 tabs 权限，只需要 activeTab 权限
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Content scripts 会自己监听 storage.onChanged 事件来同步窗口状态
    // 这里不需要主动广播消息，因为每个 content script 都会收到 storage 变化通知
    // 移除了 chrome.tabs.query({}) 调用，避免需要 tabs 权限
  }
});

// [已禁用] 在别的 tab 里恢复悬浮窗：同步活动窗口到指定 tab
// const syncWindowsToTab = (tabId: number) => {
//   chrome.storage.local.get(['activeWindows'], (result) => {
//     const activeWindows = result.activeWindows || [];
//     if (activeWindows.length > 0) {
//       chrome.tabs.sendMessage(tabId, { type: 'SYNC_WINDOWS', payload: {} }).catch(() => {});
//     }
//   });
// };

// 监听标签页创建事件
chrome.tabs.onCreated.addListener((_tab) => {
  // [已禁用] 新 tab 创建时不再同步悬浮窗
  // if (tab.id) {
  //   setTimeout(() => syncWindowsToTab(tab.id!), 500);
  // }
});

// 监听标签页更新事件（页面加载完成时）
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    // [已禁用] 页面加载完成时不再同步悬浮窗
    // syncWindowsToTab(tabId);
  }
});

// 监听标签页激活事件（切换tab时）
chrome.tabs.onActivated.addListener((activeInfo) => {
  // [已禁用] 切换 tab 时不再同步悬浮窗
  // syncWindowsToTab(activeInfo.tabId);
  applyContextMenuForTab(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  contextMenuStateByTab.delete(tabId);
});

const LOG = (msg: string, data?: object) => {
  console.log('[QuickTrans ContextMenu]', msg, data ?? '');
};

/** 每个 tab 的选中类型，用于「选中文字」单菜单的标题与点击行为 */
const contextMenuStateByTab = new Map<number, { isTimestamp: boolean; isURL: boolean }>();

function getSelectionMenuTitle(state: { isTimestamp: boolean; isURL: boolean } | undefined): string {
  const t = getTranslations(getLocale());
  if (!state) return t.contextMenu.convertTimestamp;
  if (state.isTimestamp) return t.contextMenu.convertTimestamp;
  if (state.isURL) return t.contextMenu.generateQRCode;
  return t.contextMenu.convertTimestamp;
}

function applyContextMenuForTab(tabId: number) {
  const state = contextMenuStateByTab.get(tabId);
  const title = getSelectionMenuTitle(state);
  chrome.contextMenus.update('quicktrans-selection', { title });
  LOG('applyContextMenuForTab', { tabId, title, state });
}

// 创建右键菜单：仅 2 个一级项（图片 1 个 + 选中文字 1 个），避免 Chrome 将多项收在「QuickTrans」下
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  contextMenuStateByTab.clear();
  const locale = getLocale();
  const translations = getTranslations(locale);

  chrome.contextMenus.create({
    id: 'decode-qrcode',
    title: translations.contextMenu.decodeQRCode,
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'quicktrans-selection',
    title: translations.contextMenu.convertTimestamp,
    contexts: ['selection']
  });
  LOG('onInstalled: 菜单已创建（仅 2 项，选中文字为单菜单动态标题）', { locale, ids: ['decode-qrcode', 'quicktrans-selection'] });
});

// 将图片 URL 拉取并转为 data URL，避免 content 里跨域导致一直 loading
async function fetchImageAsDataUrl(srcUrl: string): Promise<string | null> {
  try {
    const res = await fetch(srcUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  LOG('onClicked', { menuItemId: info.menuItemId, tabId: tab?.id, hasSrcUrl: !!info.srcUrl, selectionPreview: info.selectionText?.slice(0, 30) });

  if (info.menuItemId === 'decode-qrcode' && info.srcUrl && tab?.id) {
    try {
      const imageUrl = await fetchImageAsDataUrl(info.srcUrl);
      await chrome.tabs.sendMessage(tab.id, {
        type: 'DECODE_QRCODE',
        payload: { imageUrl: imageUrl || info.srcUrl }
      });
      LOG('已发送 DECODE_QRCODE', { tabId: tab.id });
    } catch (error) {
      console.error('[QuickTrans ContextMenu] send DECODE_QRCODE failed:', error);
    }
  } else if (info.menuItemId === 'quicktrans-selection' && info.selectionText && tab?.id) {
    const state = contextMenuStateByTab.get(tab.id);
    const type = state?.isURL ? 'GENERATE_QRCODE' : 'CONVERT_TIMESTAMP';
    try {
      await chrome.tabs.sendMessage(tab.id, { type, payload: { selectionText: info.selectionText } });
      LOG('已发送消息到 content', { type, tabId: tab.id, state });
    } catch (error) {
      console.error('[QuickTrans ContextMenu] send message failed:', error);
    }
  }
});

// 监听选中文本变化，用于动态更新右键菜单（只更新单菜单标题）；并供 content 获取当前 tab id
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return false;
  }
  if (message.type === 'UPDATE_CONTEXT_MENU' && sender.tab?.id != null) {
    const { isTimestamp, isURL } = message.payload;
    const tabId = sender.tab.id;
    contextMenuStateByTab.set(tabId, { isTimestamp, isURL });
    LOG('UPDATE_CONTEXT_MENU', { tabId, isTimestamp, isURL });

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id === tabId) {
      applyContextMenuForTab(tabId);
    }
    sendResponse({ success: true });
  } else if (message.type === 'UPDATE_CONTEXT_MENU_LOCALE') {
    const { locale } = message.payload;
    LOG('UPDATE_CONTEXT_MENU_LOCALE', { locale });
    await initI18n();
    const translations = getTranslations(locale);
    try {
      chrome.contextMenus.update('decode-qrcode', { title: translations.contextMenu.decodeQRCode });
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const state = activeTab?.id ? contextMenuStateByTab.get(activeTab.id) : undefined;
      const selTitle = state?.isURL ? translations.contextMenu.generateQRCode : translations.contextMenu.convertTimestamp;
      chrome.contextMenus.update('quicktrans-selection', { title: selTitle });
      LOG('菜单语言已更新', { locale });
      sendResponse({ success: true });
    } catch (error) {
      console.error('[QuickTrans ContextMenu] 更新菜单语言失败:', error);
      sendResponse({ success: false });
    }
  }
  return true;
});
