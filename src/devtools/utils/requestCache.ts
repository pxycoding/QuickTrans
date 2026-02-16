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
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return this.getAllRequests();
    }
    
    return this.getAllRequests().filter(req => {
      // 精确匹配 URL（最高优先级）
      if (req.url.toLowerCase() === lowerQuery) {
        return true;
      }
      
      // URL 包含查询（高优先级）
      if (req.url.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 方法匹配
      if (req.method.toLowerCase() === lowerQuery) {
        return true;
      }
      
      // 状态码匹配
      if (req.status.toString() === lowerQuery) {
        return true;
      }
      
      // 路径匹配（提取 URL 的路径部分）
      try {
        const urlObj = new URL(req.url);
        const pathname = urlObj.pathname.toLowerCase();
        if (pathname.includes(lowerQuery)) {
          return true;
        }
        // 查询参数匹配
        if (urlObj.search.toLowerCase().includes(lowerQuery)) {
          return true;
        }
      } catch {
        // URL 解析失败，忽略
      }
      
      return false;
    });
  }

  /**
   * 查找最匹配的请求（用于自动定位）
   * 优先精确匹配，然后模糊匹配
   */
  findBestMatch(query: string): RequestMetadata | null {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return null;
    }
    
    const allRequests = this.getAllRequests();
    
    // 1. 精确 URL 匹配
    const exactMatch = allRequests.find(req => req.url.toLowerCase() === lowerQuery);
    if (exactMatch) {
      return exactMatch;
    }
    
    // 2. URL 开头匹配
    const startsWithMatch = allRequests.find(req => req.url.toLowerCase().startsWith(lowerQuery));
    if (startsWithMatch) {
      return startsWithMatch;
    }
    
    // 3. URL 包含匹配（选择最短的 URL，通常更精确）
    const containsMatches = allRequests.filter(req => req.url.toLowerCase().includes(lowerQuery));
    if (containsMatches.length > 0) {
      // 选择最短的 URL（通常更精确）
      return containsMatches.reduce((shortest, current) => 
        current.url.length < shortest.url.length ? current : shortest
      );
    }
    
    // 4. 路径匹配
    try {
      const pathMatches = allRequests.filter(req => {
        try {
          const urlObj = new URL(req.url);
          return urlObj.pathname.toLowerCase().includes(lowerQuery);
        } catch {
          return false;
        }
      });
      if (pathMatches.length > 0) {
        return pathMatches[0]; // 返回最新的
      }
    } catch {
      // 忽略错误
    }
    
    return null;
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

  /**
   * 添加 mock 请求（用于测试）
   */
  addMockRequest(): string {
    const now = Date.now();
    const nowSeconds = Math.floor(now / 1000);
    const yesterday = now - 24 * 60 * 60 * 1000;
    const yesterdaySeconds = Math.floor(yesterday / 1000);
    const tomorrow = now + 24 * 60 * 60 * 1000;
    const tomorrowSeconds = Math.floor(tomorrow / 1000);

    // 构造包含多种时间戳格式的 mock 响应数据
    const mockResponseBody = JSON.stringify({
      code: 200,
      message: "Mock 数据 - 包含多种时间戳格式",
      data: {
        // Unix 时间戳（10位秒）
        createdAt: nowSeconds,
        updatedAt: yesterdaySeconds,
        
        // Unix 时间戳（13位毫秒）
        timestamp: now,
        lastModified: yesterday,
        expiresAt: tomorrow,
        
        // ISO8601 格式
        createdTime: new Date(now).toISOString(),
        updatedTime: new Date(yesterday).toISOString(),
        futureTime: new Date(tomorrow).toISOString(),
        
        // 字符串格式的时间戳
        createTimestamp: String(nowSeconds),
        updateTimestamp: String(yesterdaySeconds),
        expireTimestamp: String(tomorrowSeconds),
        
        // 嵌套对象中的时间戳
        user: {
          id: 12345,
          name: "测试用户",
          registerTime: nowSeconds,
          lastLoginTime: now,
          profile: {
            birthDate: 946684800, // 2000-01-01
            lastActiveAt: new Date(now).toISOString()
          }
        },
        
        // 数组中的时间戳
        items: [
          {
            id: 1,
            name: "项目1",
            createdAt: nowSeconds,
            updatedAt: now,
            time: new Date(now).toISOString()
          },
          {
            id: 2,
            name: "项目2",
            createdAt: yesterdaySeconds,
            updatedAt: yesterday,
            time: new Date(yesterday).toISOString()
          },
          {
            id: 3,
            name: "项目3",
            createdAt: tomorrowSeconds,
            updatedAt: tomorrow,
            time: new Date(tomorrow).toISOString()
          }
        ],
        
        // 混合格式
        metadata: {
          serverTime: now,
          serverTimeISO: new Date(now).toISOString(),
          serverTimeUnix: nowSeconds,
          cacheExpiry: tomorrowSeconds
        }
      },
      timestamp: now,
      serverTime: new Date(now).toISOString()
    }, null, 2);

    const requestId = `mock_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata: RequestMetadata = {
      requestId,
      url: 'https://api.example.com/mock/timestamp-test',
      method: 'GET',
      status: 200,
      statusText: 'OK',
      mimeType: 'application/json',
      type: 'xhr',
      time: 123.45,
      timestamp: now,
      responseBody: mockResponseBody,
      bodyLoaded: true,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Date', value: new Date(now).toUTCString() }
      ],
      requestHeaders: [
        { name: 'Accept', value: 'application/json' },
        { name: 'User-Agent', value: 'QuickTrans Mock Client' }
      ]
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
}

// 全局单例
export const requestCache = new RequestCache();

