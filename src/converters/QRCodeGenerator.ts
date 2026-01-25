import QRCode from 'qrcode';
import { QRCodeOptions, QRCodeResult } from '../types';

/**
 * 二维码生成器
 */
export class QRCodeGenerator {
  private static defaultOptions: QRCodeOptions = {
    size: 256,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  /**
   * 生成二维码
   * @param content 二维码内容
   * @param options 生成选项
   */
  static async generate(
    content: string,
    options: QRCodeOptions = {}
  ): Promise<QRCodeResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const dataURL: string = await QRCode.toDataURL(content, {
        width: opts.size,
        margin: opts.margin,
        errorCorrectionLevel: opts.errorCorrectionLevel,
        color: opts.color
      } as Parameters<typeof QRCode.toDataURL>[1]);

      return {
        dataURL,
        size: opts.size!,
        content
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * 生成 Canvas 元素
   */
  static async generateCanvas(
    content: string,
    options: QRCodeOptions = {}
  ): Promise<HTMLCanvasElement> {
    const opts = { ...this.defaultOptions, ...options };
    const canvas = document.createElement('canvas');

    await QRCode.toCanvas(canvas, content, {
      width: opts.size,
      margin: opts.margin,
      errorCorrectionLevel: opts.errorCorrectionLevel,
      color: opts.color
    } as any);

    return canvas;
  }

  /**
   * 下载二维码图片
   */
  static async download(
    content: string,
    filename: string = 'qrcode.png',
    options: QRCodeOptions = {}
  ): Promise<void> {
    const result = await this.generate(content, options);

    const link = document.createElement('a');
    link.href = result.dataURL;
    link.download = filename;
    link.click();
  }
}

