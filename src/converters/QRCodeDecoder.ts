import jsQR from 'jsqr';
import { DecodeResult } from '../types';

/**
 * 二维码解码器
 */
export class QRCodeDecoder {
  /**
   * 从图片 URL 解码二维码
   */
  static async decodeFromURL(imageURL: string): Promise<DecodeResult> {
    try {
      const image = await this.loadImage(imageURL);
      return this.decodeFromImage(image);
    } catch (error) {
      return {
        success: false,
        error: `Failed to load image: ${error}`
      };
    }
  }

  /**
   * 从 Image 元素解码二维码
   */
  static decodeFromImage(image: HTMLImageElement): DecodeResult {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return {
        success: false,
        error: 'Failed to get canvas context'
      };
    }

    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      return {
        success: true,
        content: code.data,
        type: this.detectContentType(code.data)
      };
    }

    return {
      success: false,
      error: 'No QR code found in image'
    };
  }

  /**
   * 从 Canvas 解码二维码
   */
  static decodeFromCanvas(canvas: HTMLCanvasElement): DecodeResult {
    const context = canvas.getContext('2d');

    if (!context) {
      return {
        success: false,
        error: 'Failed to get canvas context'
      };
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      return {
        success: true,
        content: code.data,
        type: this.detectContentType(code.data)
      };
    }

    return {
      success: false,
      error: 'No QR code found'
    };
  }

  /**
   * 从文件解码二维码
   */
  static async decodeFromFile(file: File): Promise<DecodeResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve(this.decodeFromImage(img));
        };
        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load image file'
          });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to read file'
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 加载图片
   */
  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * 检测内容类型
   */
  private static detectContentType(content: string): string {
    if (/^https?:\/\//.test(content)) {
      return 'url';
    }
    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(content)) {
      return 'email';
    }
    if (/^tel:/.test(content)) {
      return 'phone';
    }
    return 'text';
  }
}

