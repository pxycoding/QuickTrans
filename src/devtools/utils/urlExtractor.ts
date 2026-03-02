/**
 * URL提取器
 * 从 response/request 中提取所有 URL（含 http(s) 与相对路径如 /page/list?env=test）
 */

export interface ExtractedUrl {
  url: string;
  source: 'request' | 'response' | 'body';
  path?: string; // JSON路径（如果是body中的URL）
}

/** 判断字符串是否为相对路径（与 ContentDetector / QRCodeDecoder 规则一致） */
function isRelativePath(s: string): boolean {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  const hasPathQuery = t.includes('?') && /^\/?[^\s?#]+(\?[^\s#]*)?$/.test(t);
  const hasAbsolutePath = t.startsWith('/') && t.length > 1 && /^\/[^\s#]*$/.test(t);
  const hasRelativePathNoSlash = !t.includes('?') && t.includes('/') && /^[^\s#?]+\/[^\s#]*$/.test(t);
  return hasPathQuery || hasAbsolutePath || hasRelativePathNoSlash;
}

export class UrlExtractor {
  /**
   * 从文本中提取所有 URL（含 http(s) 与相对路径）
   */
  static extractFromText(text: string, source: 'request' | 'response' | 'body' = 'body'): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];
    const seen = new Set<string>();

    // 1. 提取 http(s) URL
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=]*)/g;
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      try {
        new URL(match[0]);
        if (!seen.has(match[0])) {
          seen.add(match[0]);
          urls.push({ url: match[0], source });
        }
      } catch {
        // 忽略无效 URL
      }
    }

    // 2. 提取相对路径：/path?query、path/path?query、/path、path/path（避免匹配到 http(s) 后的 path）
    const relativePathPattern = /(?:^|[^\w./-])(\/(?:[\w.-]+\/)*[\w.-]+(?:\?[^\s"'<>#]*)?)|(?:^|[^\w./-])((?:[\w.-]+\/)+[\w.-]+(?:\?[^\s"'<>#]*)?)/g;
    while ((match = relativePathPattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const pathMatch = match[1] ?? match[2];
      if (!pathMatch) continue;
      const before = match.index > 0 ? text.substring(Math.max(0, match.index - 8), match.index) : '';
      if (before.endsWith('https://') || before.endsWith('http://')) continue;
      if (!seen.has(pathMatch)) {
        seen.add(pathMatch);
        if (isRelativePath(pathMatch)) {
          urls.push({ url: pathMatch, source });
        }
      }
    }

    return urls;
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

    // 检查值本身是否是 URL 或相对路径
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      const isHttp = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&/=]*)$/.test(trimmed);
      if (isHttp) {
        try {
          new URL(trimmed);
          urls.push({ url: trimmed, source, path: basePath });
        } catch {
          // 忽略无效 URL
        }
      } else if (isRelativePath(trimmed)) {
        urls.push({ url: trimmed, source, path: basePath });
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

