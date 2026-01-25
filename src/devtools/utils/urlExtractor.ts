/**
 * URL提取器
 * 从response/request中提取所有URL
 */

export interface ExtractedUrl {
  url: string;
  source: 'request' | 'response' | 'body';
  path?: string; // JSON路径（如果是body中的URL）
}

export class UrlExtractor {
  /**
   * 从文本中提取所有URL
   */
  static extractFromText(text: string, source: 'request' | 'response' | 'body' = 'body'): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=]*)/g;
    
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      try {
        const url = new URL(match[0]);
        urls.push({
          url: match[0],
          source
        });
      } catch (e) {
        // 忽略无效URL
      }
    }

    // 去重
    const uniqueUrls = new Map<string, ExtractedUrl>();
    urls.forEach(u => {
      if (!uniqueUrls.has(u.url)) {
        uniqueUrls.set(u.url, u);
      }
    });

    return Array.from(uniqueUrls.values());
  }

  /**
   * 从JSON对象中提取所有URL
   */
  static extractFromJson(obj: any, basePath: string = '', source: 'request' | 'response' | 'body' = 'body'): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];

    if (obj === null || obj === undefined) {
      return urls;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = `${basePath}[${index}]`;
        urls.push(...this.extractFromJson(item, path, source));
      });
      return urls;
    }

    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const path = basePath ? `${basePath}.${key}` : key;
        const value = obj[key];
        urls.push(...this.extractFromJson(value, path, source));
      });
      return urls;
    }

    // 检查值本身是否是URL
    if (typeof obj === 'string') {
      const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=]*)$/;
      if (urlPattern.test(obj)) {
        try {
          new URL(obj); // 验证URL有效性
          urls.push({
            url: obj,
            source,
            path: basePath
          });
        } catch (e) {
          // 忽略无效URL
        }
      }
    }

    return urls;
  }

  /**
   * 从请求元数据中提取所有URL
   */
  static extractFromRequest(
    requestUrl: string,
    requestBody?: string,
    responseBody?: string
  ): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];

    // 请求URL本身
    urls.push({
      url: requestUrl,
      source: 'request'
    });

    // 从request body中提取
    if (requestBody) {
      try {
        const json = JSON.parse(requestBody);
        urls.push(...this.extractFromJson(json, '', 'request'));
      } catch (e) {
        // 不是JSON，尝试文本提取
        urls.push(...this.extractFromText(requestBody, 'request'));
      }
    }

    // 从response body中提取
    if (responseBody) {
      try {
        const json = JSON.parse(responseBody);
        urls.push(...this.extractFromJson(json, '', 'response'));
      } catch (e) {
        // 不是JSON，尝试文本提取
        urls.push(...this.extractFromText(responseBody, 'response'));
      }
    }

    // 去重
    const uniqueUrls = new Map<string, ExtractedUrl>();
    urls.forEach(u => {
      if (!uniqueUrls.has(u.url)) {
        uniqueUrls.set(u.url, u);
      }
    });

    return Array.from(uniqueUrls.values());
  }
}

