/**
 * jsQR 类型声明
 * jsQR 包可能不包含完整的类型定义，这里补充声明
 */
declare module 'jsqr' {
  export interface QRCode {
    binaryData: Uint8ClampedArray;
    data: string;
    location: {
      topRightCorner: { x: number; y: number };
      topLeftCorner: { x: number; y: number };
      bottomRightCorner: { x: number; y: number };
      bottomLeftCorner: { x: number; y: number };
      topRightFinderPattern: { x: number; y: number };
      topLeftFinderPattern: { x: number; y: number };
      bottomLeftFinderPattern: { x: number; y: number };
      bottomRightAlignmentPattern?: { x: number; y: number };
    };
    chunks?: any;
    version: number;
  }

  function jsQR(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCode | null;

  export default jsQR;
}

