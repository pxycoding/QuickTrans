import { ContentDetector } from '../converters/ContentDetector';
import { ContentType } from '../types';
import { debounce } from '../utils/constants';

/**
 * 选择监听器
 * 监听用户文本选择，自动检测内容类型并显示操作按钮
 */
export class SelectionMonitor {
  private actionButton: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // 监听选择变化
    document.addEventListener('selectionchange', debounce(() => {
      this.handleSelectionChange();
    }, 300));

    // 点击页面其他地方时隐藏按钮
    document.addEventListener('click', (e) => {
      if (this.actionButton && !this.actionButton.contains(e.target as Node)) {
        this.hideActionButton();
      }
    });
  }

  private handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length === 0) {
      this.hideActionButton();
      this.sendContextMenuUpdate(false, false);
      return;
    }

    const result = ContentDetector.detect(text);
    this.hideActionButton();

    const isTimestamp = result.type === ContentType.TIMESTAMP_SECOND ||
                       result.type === ContentType.TIMESTAMP_MILLISECOND ||
                       result.type === ContentType.DATETIME;
    const isURL = result.type === ContentType.URL;
    this.sendContextMenuUpdate(isTimestamp, isURL);
  }

  private sendContextMenuUpdate(isTimestamp: boolean, isURL: boolean) {
    try {
      if (!chrome?.runtime?.id) {
        console.warn('[SelectionMonitor] 扩展上下文无效，跳过发送消息');
        return;
      }
      chrome.runtime.sendMessage({
        type: 'UPDATE_CONTEXT_MENU',
        payload: { isTimestamp, isURL }
      }).catch(error => {
        if (error?.message?.includes('Extension context invalidated') ||
            chrome.runtime.lastError?.message?.includes('Extension context invalidated')) {
          console.warn('[SelectionMonitor] 扩展上下文已失效，可能需要重新加载页面');
        } else {
          console.error('[SelectionMonitor] 发送右键菜单更新消息失败:', error);
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        console.warn('[SelectionMonitor] 扩展上下文已失效');
      } else {
        console.error('[SelectionMonitor] 发送消息时发生错误:', error);
      }
    }
  }

  private hideActionButton() {
    if (this.actionButton) {
      this.actionButton.remove();
      this.actionButton = null;
    }
  }
}

