/**
 * 网络请求缓存管理器
 * 职责：按需拉取请求内容，避免性能问题
 */

// Header 类型定义
export interface Header {
  name: string;
  value: string;
}

export interface RequestMetadata {
  requestId: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  mimeType?: string;
  type?: string;
  time: number;
  timestamp: number;
  // 延迟加载的字段
  responseBody?: string;
  requestBody?: string;
  responseHeaders?: Header[];
  requestHeaders?: Header[];
  bodyLoaded: boolean;
  // 存储请求对象引用（用于按需加载）
  _requestRef?: chrome.devtools.network.Request;
}

export class RequestCache {
  private requests: Map<string, RequestMetadata> = new Map();
  private maxSize: number = 200; // 最多缓存200条请求
  private maxBodyCache: number = 20; // 最多缓存20条请求的body

  /**
   * 添加请求元数据（不拉取body）
   */
  addRequest(request: chrome.devtools.network.Request): string {
    // 使用 URL + 时间戳生成唯一 ID（因为 request.requestId 可能不存在）
    const requestId = `${request.request.url}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 安全获取属性
    const response = request.response || {};
    const requestInfo = request.request || {};
    
    const metadata: RequestMetadata = {
      requestId,
      url: requestInfo.url || '',
      method: requestInfo.method || 'GET',
      status: response.status || 0,
      statusText: response.statusText || '',
      mimeType: (response as any).mimeType,
      type: (request as any).type,
      time: request.time || 0,
      timestamp: Date.now(),
      bodyLoaded: false,
      _requestRef: request // 存储请求对象引用
    };

    // 如果超过最大数量，删除最旧的
    if (this.requests.size >= this.maxSize) {
      const oldest = Array.from(this.requests.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.requests.delete(oldest.requestId);
    }

    this.requests.set(requestId, metadata);
    return requestId;
  }

  /**
   * 按需拉取请求的完整内容
   */
  async loadRequestContent(requestId: string): Promise<RequestMetadata | null> {
    const metadata = this.requests.get(requestId);
    if (!metadata) {
      return null;
    }

    // 如果已经加载过，直接返回
    if (metadata.bodyLoaded) {
      return metadata;
    }

    try {
      // 查找对应的请求对象（需要从 DevTools API 获取）
      // 注意：这里我们需要存储请求对象的引用，或者通过其他方式获取
      // 由于 chrome.devtools.network 的限制，我们需要在添加时就尝试获取
      return metadata;
    } catch (error) {
      console.error('[RequestCache] Failed to load request content:', error);
      return metadata;
    }
  }

  /**
   * 手动加载请求内容（从请求对象）
   */
  async loadContentFromRequest(
    requestId: string,
    request?: chrome.devtools.network.Request
  ): Promise<RequestMetadata | null> {
    const metadata = this.requests.get(requestId);
    if (!metadata) {
      return null;
    }

    if (metadata.bodyLoaded) {
      return metadata;
    }

    // 使用存储的请求引用或传入的请求对象
    const requestObj = request || metadata._requestRef;
    if (!requestObj) {
      console.warn('[RequestCache] No request object available for:', requestId);
      return metadata;
    }

    try {
      // 拉取 response body
      return new Promise((resolve) => {
        requestObj.getContent((content, encoding) => {
          metadata.responseBody = content;
          
          // 处理 request body（可能是对象或字符串）
          const postData = requestObj.request?.postData;
          if (postData) {
            if (typeof postData === 'string') {
              metadata.requestBody = postData;
            } else if (typeof postData === 'object' && 'text' in postData) {
              metadata.requestBody = (postData as any).text;
            }
          }
          
          // 处理 headers（转换为我们的 Header 格式）
          const responseHeaders = requestObj.response?.headers;
          if (responseHeaders) {
            metadata.responseHeaders = Array.isArray(responseHeaders)
              ? responseHeaders.map((h: any) => ({ name: h.name || h[0], value: h.value || h[1] }))
              : Object.entries(responseHeaders).map(([name, value]) => ({ name, value: String(value) }));
          }
          
          const requestHeaders = requestObj.request?.headers;
          if (requestHeaders) {
            metadata.requestHeaders = Array.isArray(requestHeaders)
              ? requestHeaders.map((h: any) => ({ name: h.name || h[0], value: h.value || h[1] }))
              : Object.entries(requestHeaders).map(([name, value]) => ({ name, value: String(value) }));
          }
          
          metadata.bodyLoaded = true;

          // 如果缓存的body数量超过限制，清理最旧的
          this.cleanupBodyCache();

          resolve(metadata);
        });
      });
    } catch (error) {
      console.error('[RequestCache] Failed to load content:', error);
      return metadata;
    }
  }

  /**
   * 清理body缓存（保留最近查看的）
   */
  private cleanupBodyCache(): void {
    const loadedRequests = Array.from(this.requests.values())
      .filter(r => r.bodyLoaded)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (loadedRequests.length > this.maxBodyCache) {
      const toRemove = loadedRequests.slice(this.maxBodyCache);
      toRemove.forEach(req => {
        req.responseBody = undefined;
        req.requestBody = undefined;
        req.responseHeaders = undefined;
        req.requestHeaders = undefined;
        req.bodyLoaded = false;
      });
    }
  }

  /**
   * 获取所有请求（按时间倒序）
   */
  getAllRequests(): RequestMetadata[] {
    return Array.from(this.requests.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 根据ID获取请求
   */
  getRequest(requestId: string): RequestMetadata | undefined {
    return this.requests.get(requestId);
  }

  /**
   * 搜索请求
   */
  searchRequests(query: string): RequestMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllRequests().filter(req => 
      req.url.toLowerCase().includes(lowerQuery) ||
      req.method.toLowerCase().includes(lowerQuery) ||
      req.status.toString().includes(lowerQuery)
    );
  }

  /**
   * 清空所有请求
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      total: this.requests.size,
      loaded: Array.from(this.requests.values()).filter(r => r.bodyLoaded).length
    };
  }
}

// 全局单例
export const requestCache = new RequestCache();

