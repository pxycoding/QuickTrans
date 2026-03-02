import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeGenerator } from '../../converters/QRCodeGenerator';
import { QueryParamConfigManager } from '../../utils/QueryParamConfigManager';
import { QueryParamConfig } from '../../types';
import { applyParamsToUrl, extractParamsFromUrl, isParamInUrl, parsePathAndQuery } from '../utils/urlParamApplier';
import './QRCodeViewer.css';

interface QRCodeViewerProps {
  url: string;
  locale?: 'zh' | 'en';
}

const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ url, locale = 'zh' }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<QueryParamConfig[]>([]);
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set());
  const [finalUrl, setFinalUrl] = useState<string>(url);

  // 解析原链接的 query 参数（用于展示与勾选）
  const urlParams = React.useMemo(() => extractParamsFromUrl(url), [url]);

  // 加载用户配置的常用参数
  useEffect(() => {
    QueryParamConfigManager.getConfigs().then(setConfigs);
  }, []);

  // url 或 configs 变化时初始化选中状态：原链接参数默认全选，常用参数中在 URL 里的选中
  useEffect(() => {
    const parsed = extractParamsFromUrl(url);
    const initialSelected = new Set<string>();
    parsed.forEach(p => initialSelected.add(`${p.key}=${p.value}`));
    configs.forEach(config => {
      config.params.forEach(param => {
        if (isParamInUrl(url, param.key)) {
          initialSelected.add(`${param.key}=${param.value}`);
        }
      });
    });
    setSelectedParams(initialSelected);
  }, [url, configs]);

  // 生成二维码的函数
  const generateQRCode = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await QRCodeGenerator.generate(targetUrl, {
        size: 200,
        margin: 2
      });
      setQrCode(result.dataURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  }, []);

  // 计算最终 URL：仅包含选中的参数（原链接参数 + 常用参数）
  useEffect(() => {
    const commonParams = configs.flatMap(config => config.params);
    const allParams = [...urlParams, ...commonParams];
    const selected = allParams.filter(param =>
      selectedParams.has(`${param.key}=${param.value}`)
    );
    let baseUrl = url;
    try {
      const u = new URL(url);
      baseUrl = u.origin + u.pathname;
    } catch {
      // 相对路径（如 /page/list?env=test）时只保留 pathname，便于 applyParamsToUrl 拼接参数
      baseUrl = parsePathAndQuery(url).pathname;
    }
    const newUrl = applyParamsToUrl(baseUrl, selected);
    setFinalUrl(newUrl);
  }, [url, urlParams, configs, selectedParams]);

  // 当最终 URL 变化时，重新生成二维码
  useEffect(() => {
    if (finalUrl) {
      generateQRCode(finalUrl);
    }
  }, [finalUrl, generateQRCode]);

  // 初始加载时，如果没有配置参数，直接使用原始 URL 生成二维码
  useEffect(() => {
    if (configs.length === 0 && !qrCode && !loading && finalUrl === url) {
      generateQRCode(url);
    }
  }, [configs.length, qrCode, loading, finalUrl, url, generateQRCode]);

  const handleParamToggle = useCallback((key: string, value: string) => {
    const paramKey = `${key}=${value}`;
    setSelectedParams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paramKey)) {
        newSet.delete(paramKey);
      } else {
        newSet.add(paramKey);
      }
      return newSet;
    });
  }, []);

  const downloadQRCode = async () => {
    if (!qrCode) return;
    try {
      await QRCodeGenerator.download(finalUrl, `qrcode-${Date.now()}.png`, {
        size: 512,
        margin: 2
      });
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  // 常用参数（去重）
  const commonParamsList = configs.flatMap(config => config.params);
  const uniqueCommonParams = Array.from(
    new Map(commonParamsList.map(p => [`${p.key}=${p.value}`, p])).values()
  );
  const hasUrlParams = urlParams.length > 0;
  const hasCommonParams = uniqueCommonParams.length > 0;
  const hasAnyParams = hasUrlParams || hasCommonParams;

  if (loading) {
    return (
      <div className="qrcode-viewer-loading">
        {locale === 'zh' ? '生成中...' : 'Generating...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="qrcode-viewer-error">
        {error}
      </div>
    );
  }

  return (
    <div className="qrcode-viewer">
      <div className="qrcode-viewer-content">
        {/* 左侧：二维码 */}
        <div className="qrcode-left">
          {qrCode ? (
            <>
              <img
                src={qrCode}
                alt="QR Code"
                className="qrcode-image"
              />
              <div className="qrcode-actions">
                <button
                  onClick={downloadQRCode}
                  className="qrcode-btn"
                >
                  {locale === 'zh' ? '下载' : 'Download'}
                </button>
              </div>
            </>
          ) : (
            <div className="qrcode-placeholder">
              {locale === 'zh' ? '生成中...' : 'Generating...'}
            </div>
          )}
        </div>

        {/* 右侧：先显示 finalUrl，再显示常用参数 */}
        {qrCode && (
          <div className="qrcode-right">
            <div className="qrcode-url-display" title={finalUrl}>
              {finalUrl}
            </div>
            {hasAnyParams && (
              <>
                {hasUrlParams && (
                  <>
                    <div className="qrcode-params-label">
                      {locale === 'zh' ? '原链接参数' : 'URL Params'}
                    </div>
                    <div className="qrcode-params-scroll">
                      <div className="qrcode-params-list">
                        {urlParams.map((param, index) => {
                          const paramKey = `${param.key}=${param.value}`;
                          const isSelected = selectedParams.has(paramKey);
                          return (
                            <label
                              key={`url-${index}`}
                              className={`qrcode-param-item ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleParamToggle(param.key, param.value)}
                                className="qrcode-param-checkbox"
                              />
                              <span className="qrcode-param-key">{param.key}</span>
                              <span className="qrcode-param-separator">=</span>
                              <span className="qrcode-param-value">{param.value}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                {hasCommonParams && (
                  <>
                    <div className="qrcode-params-label">
                      {locale === 'zh' ? '常用参数' : 'Common Params'}
                    </div>
                    <div className="qrcode-params-scroll">
                      <div className="qrcode-params-list">
                        {uniqueCommonParams.map((param, index) => {
                          const paramKey = `${param.key}=${param.value}`;
                          const isSelected = selectedParams.has(paramKey);
                          return (
                            <label
                              key={`common-${index}`}
                              className={`qrcode-param-item ${isSelected ? 'selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleParamToggle(param.key, param.value)}
                                className="qrcode-param-checkbox"
                              />
                              <span className="qrcode-param-key">{param.key}</span>
                              <span className="qrcode-param-separator">=</span>
                              <span className="qrcode-param-value">{param.value}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeViewer;

