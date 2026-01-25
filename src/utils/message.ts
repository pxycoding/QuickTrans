import { Message, MessageType, MessageResponse } from '../types';

/**
 * 消息发送器
 */
export class MessageSender {
  /**
   * 发送消息到 Background
   */
  static async sendToBackground(
    type: MessageType,
    payload: any
  ): Promise<MessageResponse> {
    const message: Message = {
      type,
      payload,
      requestId: this.generateRequestId()
    };

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * 发送消息到 Content Script
   */
  static async sendToContent(
    tabId: number,
    type: MessageType,
    payload: any
  ): Promise<MessageResponse> {
    const message: Message = {
      type,
      payload,
      requestId: this.generateRequestId()
    };

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  private static generateRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 消息监听器
 */
export class MessageListener {
  private handlers: Map<MessageType, Function> = new Map();

  /**
   * 注册消息处理器
   */
  on(type: MessageType, handler: Function) {
    this.handlers.set(type, handler);
  }

  /**
   * 启动监听
   */
  start() {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        const handler = this.handlers.get(message.type);

        if (handler) {
          Promise.resolve(handler(message.payload, sender))
            .then(data => {
              sendResponse({ success: true, data });
            })
            .catch(error => {
              sendResponse({
                success: false,
                error: error.message || 'Unknown error'
              });
            });

          return true; // 保持消息通道开启
        }

        return false;
      }
    );
  }
}

