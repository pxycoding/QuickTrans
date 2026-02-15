/**
 * URL 参数应用工具
 */

export interface QueryParam {
  key: string;
  value: string;
}

/**
 * 将选中的参数应用到 URL
 */
export function applyParamsToUrl(baseUrl: string, selectedParams: QueryParam[]): string {
  try {
    const url = new URL(baseUrl);
    
    // 应用选中的参数
    selectedParams.forEach(param => {
      url.searchParams.set(param.key, param.value);
    });
    
    return url.toString();
  } catch (error) {
    // 如果不是有效的 URL，直接返回原 URL
    console.warn('[URLParamApplier] Invalid URL:', baseUrl, error);
    return baseUrl;
  }
}

/**
 * 从 URL 中提取现有参数
 */
export function extractParamsFromUrl(url: string): QueryParam[] {
  try {
    const urlObj = new URL(url);
    const params: QueryParam[] = [];
    
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    
    return params;
  } catch (error) {
    return [];
  }
}

/**
 * 检查参数是否在 URL 中已存在
 */
export function isParamInUrl(url: string, paramKey: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has(paramKey);
  } catch (error) {
    return false;
  }
}

