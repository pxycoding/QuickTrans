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
    const urlType = imageURL.startsWith('data:') ? 'dataURL' : 'http';
    console.log('[QRCodeDecoder] decodeFromURL start', { urlType, len: imageURL.length });
    try {
      const image = await this.loadImage(imageURL);
      console.log('[QRCodeDecoder] loadImage ok', { w: image.width, h: image.height });
      const result = this.decodeFromImage(image);
      console.log('[QRCodeDecoder] decodeFromImage done', { success: result.success });
      return result;
    } catch (error) {
      console.log('[QRCodeDecoder] decodeFromURL error', error);
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
    console.log('[QRCodeDecoder] decodeFromFile start', { name: file.name, size: file.size });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const result = this.decodeFromImage(img);
          console.log('[QRCodeDecoder] decodeFromFile done', { success: result.success });
          resolve(result);
        };
        img.onerror = () => {
          console.log('[QRCodeDecoder] decodeFromFile image onerror');
          resolve({
            success: false,
            error: 'Failed to load image file'
          });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        console.log('[QRCodeDecoder] decodeFromFile reader onerror');
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
    console.log('[QRCodeDecoder] loadImage start');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('[QRCodeDecoder] loadImage onload');
        resolve(img);
      };
      img.onerror = (e) => {
        console.log('[QRCodeDecoder] loadImage onerror', e);
        reject(e);
      };
      img.src = url;
    });
  }

  /**
   * 检测内容类型（含相对路径，以便解码后显示 query 参数与常用参数）
   */
  private static detectContentType(content: string): string {
    if (/^https?:\/\//.test(content)) {
      return 'url';
    }
    // 相对路径：/path?query、path?query、/path、path/path → 视为 url，弹窗中展示参数列表
    const hasPathQuery = content.includes('?') && /^\/?[^\s?#]+(\?[^\s#]*)?$/.test(content);
    const hasAbsolutePath = content.startsWith('/') && content.length > 1 && /^\/[^\s#]*$/.test(content);
    const hasRelativePathNoSlash = !content.includes('?') && content.includes('/') && /^[^\s#?]+\/[^\s#]*$/.test(content);
    if (hasPathQuery || hasAbsolutePath || hasRelativePathNoSlash) {
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

