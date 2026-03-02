import { ContentType, DetectionResult } from '../types';

/**
 * 内容检测器
 * 职责: 自动识别选中文本的类型
 */
export class ContentDetector {
  /**
   * 检测内容类型
   * @param text 待检测文本
   * @returns 检测结果
   */
  static detect(text: string): DetectionResult {
    console.log('[ContentDetector] 检测文本:', text);
    // 去除首尾空格
    text = text.trim();

    // 1. 检测时间戳(秒) - 10位数字
    if (/^\d{10}$/.test(text)) {
      const timestamp = parseInt(text);
      console.log('[ContentDetector] 匹配10位数字，时间戳值:', timestamp);
      // 验证是否在合理范围 (2000-01-01 到 2100-01-01)
      if (timestamp >= 946684800 && timestamp <= 4102444800) {
        console.log('[ContentDetector] ✅ 识别为秒级时间戳');
        return {
          type: ContentType.TIMESTAMP_SECOND,
          value: text,
          confidence: 0.95
        };
      } else {
        console.log('[ContentDetector] 时间戳超出合理范围');
      }
    }

    // 2. 检测时间戳(毫秒) - 13位数字
    if (/^\d{13}$/.test(text)) {
      const timestamp = parseInt(text);
      console.log('[ContentDetector] 匹配13位数字，时间戳值:', timestamp);
      // 验证是否在合理范围
      if (timestamp >= 946684800000 && timestamp <= 4102444800000) {
        console.log('[ContentDetector] ✅ 识别为毫秒级时间戳');
        return {
          type: ContentType.TIMESTAMP_MILLISECOND,
          value: text,
          confidence: 0.95
        };
      } else {
        console.log('[ContentDetector] 时间戳超出合理范围');
      }
    }

    // 3. 检测标准日期时间
    const datetimePatterns = [
      /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/,     // YYYY-MM-DD HH:mm:ss
      /^\d{4}\/\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2}$/,   // YYYY/MM/DD HH:mm:ss
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,       // ISO 8601
    ];

    for (const pattern of datetimePatterns) {
      if (pattern.test(text)) {
        console.log('[ContentDetector] ✅ 识别为日期时间格式');
        return {
          type: ContentType.DATETIME,
          value: text,
          confidence: 0.9
        };
      }
    }

    // 4. 检测 URL（含 http(s) 与相对路径 /path 或 path?query）
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=]*)$/;
    if (urlPattern.test(text)) {
      try {
        const url = new URL(text);
        console.log('[ContentDetector] ✅ 识别为 URL:', url.href);
        return {
          type: ContentType.URL,
          value: text,
          confidence: 0.98,
          metadata: {
            protocol: url.protocol,
            domain: url.hostname
          }
        };
      } catch (e) {
        console.log('[ContentDetector] URL 解析失败:', e);
      }
    }

    // 5. 检测相对路径（/page/list?env=test、page/list?env=test、/page/list、page/list），用于原生应用路径 → 显示「生成二维码」
    const hasPathQuery = text.includes('?') && /^\/?[^\s?#]+(\?[^\s#]*)?$/.test(text);
    const hasAbsolutePath = text.startsWith('/') && text.length > 1 && /^\/[^\s#]*$/.test(text);
    const hasRelativePathNoSlash = !text.includes('?') && text.includes('/') && /^[^\s#?]+\/[^\s#]*$/.test(text);
    if (hasPathQuery || hasAbsolutePath || hasRelativePathNoSlash) {
      console.log('[ContentDetector] ✅ 识别为相对路径/URL:', text.slice(0, 60));
      return {
        type: ContentType.URL,
        value: text,
        confidence: 0.85
      };
    }

    console.log('[ContentDetector] ❌ 未识别的内容类型');
    return {
      type: ContentType.UNKNOWN,
      value: text,
      confidence: 0
    };
  }

  /**
   * 批量检测
   */
  static detectMultiple(texts: string[]): DetectionResult[] {
    return texts.map(text => this.detect(text));
  }
}

