import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { TimestampConverter } from '../../converters/TimestampConverter';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 时间戳扫描结果
 */
export interface TimestampMatch {
  path: string; // JSON路径，如 "data.items[0].createdAt"
  originalValue: string | number;
  converted: {
    standard: string;
    iso8601: string;
    unix: number;
    unixMs: number;
    relative?: string;
  };
  type: 'number' | 'string' | 'iso8601' | 'datetime';
}

export interface TimestampScanOptions {
  timezone?: string;
}

/**
 * 增强版时间戳扫描器
 * 支持多种时间戳形态的识别和转换
 */
export class TimestampScanner {
  /**
   * 从JSON对象中扫描所有时间戳
   * @param options.timezone 时区（与 popup 选择的时区一致），不传则使用浏览器本地时区
   */
  static scanJson(obj: any, basePath: string = '', options?: TimestampScanOptions): TimestampMatch[] {
    const matches: TimestampMatch[] = [];
    const tz = options?.timezone;

    if (obj === null || obj === undefined) {
      return matches;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = `${basePath}[${index}]`;
        matches.push(...this.scanJson(item, path, options));
      });
      return matches;
    }

    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const path = basePath ? `${basePath}.${key}` : key;
        const value = obj[key];
        matches.push(...this.scanJson(value, path, options));
      });
      return matches;
    }

    // 检查值本身是否是时间戳
    const match = this.detectTimestamp(obj, basePath, tz);
    if (match) {
      matches.push(match);
    }

    return matches;
  }

  /**
   * 从文本中扫描时间戳（非JSON场景）
   * @param options.timezone 时区（与 popup 选择的时区一致）
   */
  static scanText(text: string, options?: TimestampScanOptions): TimestampMatch[] {
    const matches: TimestampMatch[] = [];

    // 1. 检测纯数字时间戳（10位秒 / 13位毫秒）
    const numberPatterns = [
      /(?:^|\s)(\d{10})(?:\s|$)/g,  // 10位秒
      /(?:^|\s)(\d{13})(?:\s|$)/g,  // 13位毫秒
    ];

    const tz = options?.timezone;

    numberPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1];
        const timestamp = this.detectTimestamp(value, '', tz);
        if (timestamp) {
          matches.push({
            ...timestamp,
            path: `text:${match.index}`
          });
        }
      }
    });

    // 2. 检测ISO8601格式
    const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})/g;
    let isoMatch;
    while ((isoMatch = isoPattern.exec(text)) !== null) {
      const timestamp = this.detectTimestamp(isoMatch[0], '', tz);
      if (timestamp) {
        matches.push({
          ...timestamp,
          path: `text:${isoMatch.index}`
        });
      }
    }

    // 3. 检测常见日期时间格式
    const datetimePatterns = [
      /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/g,
      /\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/g,
    ];

    datetimePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const timestamp = this.detectTimestamp(match[0], '', tz);
        if (timestamp) {
          matches.push({
            ...timestamp,
            path: `text:${match.index}`
          });
        }
      }
    });

    return matches;
  }

  /**
   * 检测单个值是否是时间戳
   */
  private static detectTimestamp(
    value: any,
    path: string,
    timezone?: string
  ): TimestampMatch | null {
    if (value === null || value === undefined) {
      return null;
    }

    const converterOptions = timezone ? { timezone } : undefined;

    // 1. Number类型：10位秒 / 13位毫秒
    if (typeof value === 'number') {
      const str = value.toString();
      if (str.length === 10 || str.length === 13) {
        const num = parseInt(str);
        // 验证范围（2000-01-01 到 2100-01-01）
        const min = str.length === 10 ? 946684800 : 946684800000;
        const max = str.length === 10 ? 4102444800 : 4102444800000;
        
        if (num >= min && num <= max) {
          try {
            const result = TimestampConverter.fromTimestamp(num, converterOptions);
            return {
              path,
              originalValue: value,
              converted: {
                standard: result.standard,
                iso8601: result.iso8601,
                unix: result.unix,
                unixMs: result.unixMs,
                relative: result.relative
              },
              type: 'number'
            };
          } catch (e) {
            return null;
          }
        }
      }
      return null;
    }

    // 2. String类型：多种格式
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // 2.1 纯数字字符串（10/13位）
      if (/^\d{10}$/.test(trimmed)) {
        const num = parseInt(trimmed);
        if (num >= 946684800 && num <= 4102444800) {
          try {
            const result = TimestampConverter.fromTimestamp(num, converterOptions);
            return {
              path,
              originalValue: value,
              converted: {
                standard: result.standard,
                iso8601: result.iso8601,
                unix: result.unix,
                unixMs: result.unixMs,
                relative: result.relative
              },
              type: 'string'
            };
          } catch (e) {
            return null;
          }
        }
      }

      if (/^\d{13}$/.test(trimmed)) {
        const num = parseInt(trimmed);
        if (num >= 946684800000 && num <= 4102444800000) {
          try {
            const result = TimestampConverter.fromTimestamp(num, converterOptions);
            return {
              path,
              originalValue: value,
              converted: {
                standard: result.standard,
                iso8601: result.iso8601,
                unix: result.unix,
                unixMs: result.unixMs,
                relative: result.relative
              },
              type: 'string'
            };
          } catch (e) {
            return null;
          }
        }
      }

      // 2.2 ISO8601格式
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
      if (isoPattern.test(trimmed)) {
        try {
          const result = TimestampConverter.toTimestamp(trimmed, converterOptions);
          return {
            path,
            originalValue: value,
            converted: {
              standard: result.standard,
              iso8601: result.iso8601,
              unix: result.unix,
              unixMs: result.unixMs,
              relative: result.relative
            },
            type: 'iso8601'
          };
        } catch (e) {
          return null;
        }
      }

      // 2.3 常见日期时间格式
      const datetimePatterns = [
        /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
        /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/,
      ];

      for (const pattern of datetimePatterns) {
        if (pattern.test(trimmed)) {
          try {
            const result = TimestampConverter.toTimestamp(trimmed, converterOptions);
            return {
              path,
              originalValue: value,
              converted: {
                standard: result.standard,
                iso8601: result.iso8601,
                unix: result.unix,
                unixMs: result.unixMs,
                relative: result.relative
              },
              type: 'datetime'
            };
          } catch (e) {
            // 继续尝试下一个格式
          }
        }
      }
    }

    return null;
  }
}

