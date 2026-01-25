import { MessageType, Message, MessageResponse } from '../types';

/**
 * 消息处理器
 */
export class MessageHandler {
  /**
   * 处理消息
   */
  static async handle(message: Message, _sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case MessageType.DETECT_CONTENT:
          return await this.handleDetectContent(message.payload);
        case MessageType.CONVERT_TIMESTAMP:
          return await this.handleConvertTimestamp(message.payload);
        case MessageType.GENERATE_QRCODE:
          return await this.handleGenerateQRCode(message.payload);
        case MessageType.DECODE_QRCODE:
          return await this.handleDecodeQRCode(message.payload);
        default:
          return {
            success: false,
            error: `Unknown message type: ${message.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async handleDetectContent(_payload: unknown): Promise<MessageResponse> {
    // 内容检测在content script中完成
    return { success: true, data: null };
  }

  private static async handleConvertTimestamp(_payload: unknown): Promise<MessageResponse> {
    // 时间戳转换在content script中完成
    return { success: true, data: null };
  }

  private static async handleGenerateQRCode(_payload: unknown): Promise<MessageResponse> {
    // 二维码生成在content script中完成
    return { success: true, data: null };
  }

  private static async handleDecodeQRCode(_payload: unknown): Promise<MessageResponse> {
    // 二维码解码在content script中完成
    return { success: true, data: null };
  }
}

