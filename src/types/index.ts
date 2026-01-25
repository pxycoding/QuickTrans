/**
 * 内容类型枚举
 */
export enum ContentType {
  TIMESTAMP_SECOND = 'timestamp_second',
  TIMESTAMP_MILLISECOND = 'timestamp_millisecond',
  DATETIME = 'datetime',
  URL = 'url',
  UNKNOWN = 'unknown'
}

/**
 * 检测结果
 */
export interface DetectionResult {
  type: ContentType;
  value: string;
  confidence: number;
  metadata?: {
    timezone?: string;
    protocol?: string;
    domain?: string;
  };
}

/**
 * 时间戳转换选项
 */
export interface ConvertOptions {
  timezone?: string;
  format?: string;
  includeRelative?: boolean;
}

/**
 * 时间戳转换结果
 */
export interface TimestampResult {
  original: string | number;
  standard: string;
  iso8601: string;
  unix: number;
  unixMs: number;
  relative?: string;
  timezone: string;
}

/**
 * 二维码生成选项
 */
export interface QRCodeOptions {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * 二维码生成结果
 */
export interface QRCodeResult {
  dataURL: string;
  size: number;
  content: string;
}

/**
 * 二维码解码结果
 */
export interface DecodeResult {
  success: boolean;
  content?: string;
  type?: string;
  error?: string;
}

/**
 * 常用query参数配置
 */
export interface QueryParamConfig {
  id: string;
  name: string;
  params: { key: string; value: string }[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 消息类型
 */
export enum MessageType {
  DETECT_CONTENT = 'DETECT_CONTENT',
  CONVERT_TIMESTAMP = 'CONVERT_TIMESTAMP',
  GENERATE_QRCODE = 'GENERATE_QRCODE',
  DECODE_QRCODE = 'DECODE_QRCODE',
  DETECTION_RESULT = 'DETECTION_RESULT',
  CONVERSION_RESULT = 'CONVERSION_RESULT',
  GENERATION_RESULT = 'GENERATION_RESULT',
  DECODING_RESULT = 'DECODING_RESULT',
  GET_HISTORY = 'GET_HISTORY',
  GET_SETTINGS = 'GET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS'
}

/**
 * 消息接口
 */
export interface Message {
  type: MessageType;
  payload: any;
  requestId?: string;
}

/**
 * 消息响应
 */
export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

