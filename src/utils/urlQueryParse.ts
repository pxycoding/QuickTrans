/**
 * URL / 路径的 query 解析工具
 * 支持完整 URL（http(s) 等）和原生应用相对路径：
 * - 有前导 /：/page/list?env=test
 * - 无前导 /：page/list?env=test
 */

export interface QueryParam {
  key: string;
  value: string;
}

/** 从 "?key=value&..." 或 search 字符串解析出参数列表 */
export function parseQueryString(search: string): QueryParam[] {
  if (!search || !search.trim()) return [];
  const params: QueryParam[] = [];
  const part = search.startsWith('?') ? search.slice(1) : search;
  for (const pair of part.split('&')) {
    const eq = pair.indexOf('=');
    if (eq === -1) {
      if (pair) params.push({ key: decodeURIComponent(pair), value: '' });
    } else {
      params.push({
        key: decodeURIComponent(pair.slice(0, eq).replace(/\+/g, ' ')),
        value: decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '))
      });
    }
  }
  return params;
}

/** 将 pathname + search 从任意 URL 字符串中拆出（支持相对路径，有无前导 / 均可） */
export function parsePathAndQuery(url: string): { pathname: string; search: string } {
  const q = url.indexOf('?');
  if (q === -1) return { pathname: url, search: '' };
  return { pathname: url.slice(0, q), search: url.slice(q) };
}

/** 从 URL 中提取 query 参数，支持绝对 URL 和相对路径（/path?key=value 或 path?key=value） */
export function extractParamsFromUrl(url: string): QueryParam[] {
  if (!url || !url.trim()) return [];
  try {
    const u = new URL(url);
    const params: QueryParam[] = [];
    u.searchParams.forEach((value, key) => params.push({ key, value }));
    return params;
  } catch {
    const { search } = parsePathAndQuery(url);
    return parseQueryString(search);
  }
}

/** 将参数列表编码为 search 字符串（不含前导 ?） */
function buildSearchString(params: QueryParam[]): string {
  if (params.length === 0) return '';
  return params
    .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
}

/**
 * 将选中的参数应用到 baseUrl 上
 * baseUrl 可以是完整 URL 或相对路径（/path、path 或 path?existing=1）
 */
export function applyParamsToUrl(baseUrl: string, selectedParams: QueryParam[]): string {
  try {
    const u = new URL(baseUrl);
    selectedParams.forEach(p => u.searchParams.set(p.key, p.value));
    return u.toString();
  } catch {
    const { pathname } = parsePathAndQuery(baseUrl);
    const search = buildSearchString(selectedParams);
    return search ? `${pathname}?${search}` : pathname;
  }
}

/** 检查 URL 或 path?query 中是否包含某参数 key */
export function isParamInUrl(url: string, paramKey: string): boolean {
  try {
    const u = new URL(url);
    return u.searchParams.has(paramKey);
  } catch {
    const params = extractParamsFromUrl(url);
    return params.some(p => p.key === paramKey);
  }
}
