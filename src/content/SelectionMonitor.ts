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
    console.log('[SelectionMonitor] 构造函数调用');
    this.init();
  }

  private init() {
    console.log('[SelectionMonitor] 初始化事件监听器');
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
    console.log('[SelectionMonitor] 事件监听器注册完成');
  }

  private handleSelectionChange() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    console.log('[SelectionMonitor] 选择变化，文本:', text);

    if (!text || text.length === 0) {
      this.hideActionButton();
      return;
    }

    // 检测内容类型
    console.log('[SelectionMonitor] 开始检测内容类型...');
    const result = ContentDetector.detect(text);
    console.log('[SelectionMonitor] 检测结果:', result);

    // URL类型的悬浮按钮已移除，改由右键菜单触发
    this.hideActionButton();
    
    // 发送内容类型检测结果到background，用于更新右键菜单
    const isTimestamp = result.type === ContentType.TIMESTAMP_SECOND || 
                       result.type === ContentType.TIMESTAMP_MILLISECOND ||
                       result.type === ContentType.DATETIME;
    const isURL = result.type === ContentType.URL;
    
    console.log('[SelectionMonitor] 发送右键菜单更新消息:', { isTimestamp, isURL });
    
    // 检查扩展上下文是否有效
    try {
      if (!chrome?.runtime?.id) {
        console.warn('[SelectionMonitor] 扩展上下文无效，跳过发送消息');
        return;
      }
      
      chrome.runtime.sendMessage({
        type: 'UPDATE_CONTEXT_MENU',
        payload: {
          isTimestamp,
          isURL
        }
      }).catch(error => {
        // 检查是否是扩展上下文失效错误
        if (error?.message?.includes('Extension context invalidated') || 
            chrome.runtime.lastError?.message?.includes('Extension context invalidated')) {
          console.warn('[SelectionMonitor] 扩展上下文已失效，可能需要重新加载页面');
        } else {
          console.error('[SelectionMonitor] 发送右键菜单更新消息失败:', error);
        }
      });
    } catch (error) {
      // 捕获同步错误（如 chrome.runtime 未定义）
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

