import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { QRCodeDecoderPanel } from '../components/QRCodeDecoderPanel';
import { TimestampPanel } from '../components/TimestampPanel';
import { ContentType } from '../types';
import { initI18n } from '../i18n/config';

interface WindowInstance {
  id: string;
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

  private async render(windowId: string, component: React.ReactElement) {
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

  async showTimestampPanel(value: string, type: ContentType, _minimized: boolean = false, windowId?: string) {
    const id = windowId || this.generateWindowId();
    console.log('[FloatWindowManager] 显示时间戳面板:', { value, type, windowId: id });
    await this.render(
      id,
      React.createElement(TimestampPanel, {
        value,
        type,
        windowId: id,
        onClose: () => this.close(id)
      })
    );
    console.log('[FloatWindowManager] ✅ 时间戳面板已渲染');
    return id;
  }

  async showQRCodeDecoderPanel(imageUrl?: string, imageFile?: File, url?: string, minimized: boolean = false, windowId?: string) {
    const id = windowId || this.generateWindowId();
    console.log('[FloatWindowManager] 显示二维码识别面板:', { imageUrl, imageFile, url, minimized, windowId: id });
    await this.render(
      id,
      React.createElement(QRCodeDecoderPanel, {
        imageUrl,
        imageFile,
        url,
        windowId: id,
        onClose: () => this.close(id),
        minimized
      })
    );
    console.log('[FloatWindowManager] ✅ 二维码识别面板已渲染');
    return id;
  }

  close(windowId?: string) {
    if (windowId) {
      // 关闭指定窗口
      const window = this.windows.get(windowId);
      if (window) {
        window.root.unmount();
        if (window.container && window.container.parentNode) {
          window.container.parentNode.removeChild(window.container);
        }
        this.windows.delete(windowId);
        this.removeWindowFromStorage(windowId);
        console.log('[FloatWindowManager] 关闭窗口:', windowId);
      }
    } else {
      // 关闭所有窗口
      this.windows.forEach((window, id) => {
        window.root.unmount();
        if (window.container && window.container.parentNode) {
          window.container.parentNode.removeChild(window.container);
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

