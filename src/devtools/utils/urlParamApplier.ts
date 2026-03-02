/**
 * URL 参数应用工具
 * 支持完整 URL（http(s)）和相对路径（如 /page/list?env=test）
 */

export {
  type QueryParam,
  applyParamsToUrl,
  extractParamsFromUrl,
  isParamInUrl,
  parsePathAndQuery
} from '../../utils/urlQueryParse';
