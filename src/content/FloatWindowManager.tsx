import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { QRCodeDecoderPanel } from '../components/QRCodeDecoderPanel';
import { TimestampPanel } from '../components/TimestampPanel';
import { ContentType } from '../types';
import { initI18n } from '../i18n/config';

/** 时间戳面板的时间调整量 */
export interface TimeAdjustments {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** 当前 tab 内窗口快照，用于刷新后恢复 */
export type TabWindowSnapshot =
  | {
      windowId: string;
      type: 'timestamp';
      value: string;
      contentType: ContentType;
      minimized: boolean;
      timeAdjustments?: TimeAdjustments;
    }
  | {
      windowId: string;
      type: 'qrcode';
      showModeSwitcher: boolean;
      imageUrl?: string;
      url?: string;
      minimized: boolean;
      windowName?: string;
      selectedParams?: string[];
      selectedCommonParams?: { key: string; value: string }[];
      /** 完整 URL 参数列表（含未勾选），刷新后恢复 query 列表不丢项 */
      urlParams?: { key: string; value: string }[];
    };

interface WindowInstance {
  id: string;
  tabId?: number;
  root: Root;
  container: HTMLElement;
}

/**
 * 悬浮窗管理器
 * 管理所有悬浮窗的显示和隐藏，支持多个窗口实例
 */
export class FloatWindowManager {
  private windows: Map<string, WindowInstance> = new Map();

  private generateWindowId(): string {
    return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureContainer(windowId: string): HTMLElement {
    const containerId = `qa-booster-root-${windowId}`;
    let container = document.getElementById(containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
    
    return container;
  }

  private tabWindowsKey(tabId: number): string {
    return `tabWindows_${tabId}`;
  }

  private async getTabWindowSnapshots(tabId: number): Promise<TabWindowSnapshot[]> {
    const key = this.tabWindowsKey(tabId);
    const result = await chrome.storage.local.get([key]);
    return result[key] ?? [];
  }

  private async saveTabWindowSnapshot(tabId: number, snapshot: TabWindowSnapshot): Promise<void> {
    const key = this.tabWindowsKey(tabId);
    const list = await this.getTabWindowSnapshots(tabId);
    if (list.some((s) => s.windowId === snapshot.windowId)) return;
    list.push(snapshot);
    await chrome.storage.local.set({ [key]: list });
  }

  private async removeTabWindowSnapshot(tabId: number, windowId: string): Promise<void> {
    const key = this.tabWindowsKey(tabId);
    const list = (await this.getTabWindowSnapshots(tabId)).filter((s) => s.windowId !== windowId);
    await chrome.storage.local.set({ [key]: list });
  }

  /** 更新某二维码窗口在 tab 快照中的名称（用户编辑名称后调用，便于刷新后恢复） */
  async updateTabWindowQRCodeName(windowId: string, windowName: string): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'qrcode' && s.windowId === windowId ? { ...s, windowName } : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 更新某二维码窗口在 tab 快照中的展开/收起状态（用户点击最小化/展开后调用，便于刷新后恢复） */
  async updateTabWindowQRCodeMinimized(windowId: string, minimized: boolean): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'qrcode' && s.windowId === windowId ? { ...s, minimized } : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 更新某时间戳窗口在 tab 快照中的输入内容与类型（popup 内用户输入后刷新可恢复） */
  async updateTabWindowTimestampValue(windowId: string, value: string, contentType: ContentType): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'timestamp' && s.windowId === windowId ? { ...s, value, contentType } : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 更新某时间戳窗口在 tab 快照中的时间调整量（刷新后恢复） */
  async updateTabWindowTimestampTimeAdjustments(windowId: string, timeAdjustments: TimeAdjustments): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'timestamp' && s.windowId === windowId ? { ...s, timeAdjustments } : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 更新某二维码窗口在 tab 快照中的链接/内容（popup 内用户输入后刷新可恢复） */
  async updateTabWindowQRCodeUrl(windowId: string, url: string): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'qrcode' && s.windowId === windowId ? { ...s, url: url || undefined } : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 更新某二维码窗口在 tab 快照中的参数勾选与完整参数列表（刷新后 query 列表不丢未勾选项） */
  async updateTabWindowQRCodeParamSelection(
    windowId: string,
    selectedParams: string[],
    selectedCommonParams: { key: string; value: string }[],
    urlParams?: { key: string; value: string }[]
  ): Promise<void> {
    const win = this.windows.get(windowId);
    if (win?.tabId == null) return;
    const list = await this.getTabWindowSnapshots(win.tabId);
    const key = this.tabWindowsKey(win.tabId);
    const next = list.map((s) =>
      s.type === 'qrcode' && s.windowId === windowId
        ? { ...s, selectedParams, selectedCommonParams, urlParams }
        : s
    );
    await chrome.storage.local.set({ [key]: next });
  }

  /** 供 content 在页面加载时恢复当前 tab 的窗口 */
  async restoreTabWindows(tabId: number): Promise<void> {
    const snapshots = await this.getTabWindowSnapshots(tabId);
    if (snapshots.length === 0) return;
    for (const snap of snapshots) {
      if (snap.type === 'timestamp') {
        await this.showTimestampPanel(
          snap.value,
          snap.contentType,
          snap.minimized,
          snap.windowId,
          tabId,
          true,
          snap.timeAdjustments
        );
      } else {
        await this.showQRCodeDecoderPanel(
          snap.imageUrl,
          undefined,
          snap.url,
          snap.minimized,
          snap.windowId,
          snap.showModeSwitcher,
          tabId,
          true,
          snap.windowName,
          snap.selectedParams,
          snap.selectedCommonParams,
          snap.urlParams
        );
      }
    }
  }

  private async render(windowId: string, component: React.ReactElement, tabId?: number) {
    console.log('[FloatWindowManager] 开始渲染组件，窗口ID:', windowId);
    
    // 确保 i18next 已初始化
    await initI18n();
    
    // 如果窗口已存在，先清理
    if (this.windows.has(windowId)) {
      const existing = this.windows.get(windowId)!;
      existing.root.unmount();
      this.windows.delete(windowId);
    }

    // 创建新窗口
    const container = this.ensureContainer(windowId);
    const root = createRoot(container);
    root.render(component);
    
    this.windows.set(windowId, {
      id: windowId,
      tabId,
      root,
      container
    });
    
    console.log('[FloatWindowManager] ✅ 组件渲染完成，窗口ID:', windowId);
    
    // 保存窗口ID到storage，用于跨tab同步
    this.saveWindowToStorage(windowId);
  }

  private async saveWindowToStorage(windowId: string) {
    try {
      const result = await chrome.storage.local.get(['activeWindows']);
      const activeWindows = result.activeWindows || [];
      if (!activeWindows.includes(windowId)) {
        activeWindows.push(windowId);
        await chrome.storage.local.set({ activeWindows });
      }
    } catch (error) {
      console.error('[FloatWindowManager] 保存窗口ID失败:', error);
    }
  }

  private async removeWindowFromStorage(windowId: string) {
    try {
      const result = await chrome.storage.local.get(['activeWindows']);
      const activeWindows = (result.activeWindows || []).filter((id: string) => id !== windowId);
      await chrome.storage.local.set({ activeWindows });
    } catch (error) {
      console.error('[FloatWindowManager] 移除窗口ID失败:', error);
    }
  }

  async showTimestampPanel(
    value: string,
    type: ContentType,
    minimized: boolean = false,
    windowId?: string,
    tabId?: number,
    restore?: boolean,
    initialTimeAdjustments?: TimeAdjustments
  ) {
    const id = windowId || this.generateWindowId();
    console.log('[FloatWindowManager] 显示时间戳面板:', { value, type, windowId: id, tabId, restore });
    await this.render(
      id,
      React.createElement(TimestampPanel, {
        value,
        type,
        windowId: id,
        onClose: () => this.close(id),
        onValueChange: tabId != null ? (v, t) => this.updateTabWindowTimestampValue(id, v, t) : undefined,
        initialTimeAdjustments,
        onTimeAdjustmentsChange:
          tabId != null ? (adj) => this.updateTabWindowTimestampTimeAdjustments(id, adj) : undefined
      }),
      tabId
    );
    if (tabId != null && !restore) {
      await this.saveTabWindowSnapshot(tabId, {
        windowId: id,
        type: 'timestamp',
        value,
        contentType: type,
        minimized
      });
    }
    console.log('[FloatWindowManager] ✅ 时间戳面板已渲染');
    return id;
  }

  async showQRCodeDecoderPanel(
    imageUrl?: string,
    imageFile?: File,
    url?: string,
    minimized: boolean = false,
    windowId?: string,
    showModeSwitcher: boolean = true,
    tabId?: number,
    restore?: boolean,
    windowName?: string,
    initialSelectedParams?: string[],
    initialSelectedCommonParams?: { key: string; value: string }[],
    initialUrlParams?: { key: string; value: string }[]
  ) {
    const id = windowId || this.generateWindowId();
    console.log('[FloatWindowManager] 显示二维码识别面板:', {
      imageUrl,
      imageFile,
      url,
      minimized,
      windowId: id,
      showModeSwitcher,
      tabId,
      restore
    });
    await this.render(
      id,
      React.createElement(QRCodeDecoderPanel, {
        imageUrl,
        imageFile,
        url,
        windowId: id,
        onClose: () => this.close(id),
        minimized,
        showModeSwitcher,
        initialWindowName: windowName,
        initialSelectedParams,
        initialSelectedCommonParams,
        initialUrlParams,
        onWindowNameSave: (name) => this.updateTabWindowQRCodeName(id, name),
        onMinimizedChange: (minimized) => this.updateTabWindowQRCodeMinimized(id, minimized),
        onUrlChange: tabId != null ? (url) => this.updateTabWindowQRCodeUrl(id, url) : undefined,
        onParamSelectionChange:
          tabId != null
            ? (selectedParams, selectedCommonParams, urlParams) =>
                this.updateTabWindowQRCodeParamSelection(id, selectedParams, selectedCommonParams, urlParams)
            : undefined
      }),
      tabId
    );
    if (tabId != null && !restore) {
      await this.saveTabWindowSnapshot(tabId, {
        windowId: id,
        type: 'qrcode',
        showModeSwitcher,
        imageUrl,
        url: url ?? undefined,
        minimized,
        windowName
      });
    }
    console.log('[FloatWindowManager] ✅ 二维码识别面板已渲染');
    return id;
  }

  close(windowId?: string) {
    if (windowId) {
      // 关闭指定窗口
      const win = this.windows.get(windowId);
      if (win) {
        if (win.tabId != null) {
          this.removeTabWindowSnapshot(win.tabId, windowId);
        }
        // 用户主动关闭时清除位置/大小，避免残留
        chrome.storage.local.remove([
          `floatWindowPosition_${windowId}`,
          `floatWindowSize_${windowId}`
        ]);
        win.root.unmount();
        if (win.container?.parentNode) {
          win.container.parentNode.removeChild(win.container);
        }
        this.windows.delete(windowId);
        this.removeWindowFromStorage(windowId);
        console.log('[FloatWindowManager] 关闭窗口:', windowId);
      }
    } else {
      // 关闭所有窗口
      this.windows.forEach((win, id) => {
        if (win.tabId != null) {
          this.removeTabWindowSnapshot(win.tabId, id);
        }
        chrome.storage.local.remove([
          `floatWindowPosition_${id}`,
          `floatWindowSize_${id}`
        ]);
        win.root.unmount();
        if (win.container?.parentNode) {
          win.container.parentNode.removeChild(win.container);
        }
        this.removeWindowFromStorage(id);
      });
      this.windows.clear();
      console.log('[FloatWindowManager] 关闭所有窗口');
    }
  }

  // 获取所有活动窗口ID
  getActiveWindows(): string[] {
    return Array.from(this.windows.keys());
  }
}

