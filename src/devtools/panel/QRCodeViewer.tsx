import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeGenerator } from '../../converters/QRCodeGenerator';
import { QueryParamConfigManager } from '../../utils/QueryParamConfigManager';
import { QueryParamConfig } from '../../types';
import { applyParamsToUrl, isParamInUrl } from '../utils/urlParamApplier';
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

  // 加载用户配置的参数
  useEffect(() => {
    const loadConfigs = async () => {
      const loadedConfigs = await QueryParamConfigManager.getConfigs();
      setConfigs(loadedConfigs);
      
      // 初始化选中状态：URL 中已存在的参数默认选中
      const initialSelected = new Set<string>();
      loadedConfigs.forEach(config => {
        config.params.forEach(param => {
          if (isParamInUrl(url, param.key)) {
            initialSelected.add(`${param.key}=${param.value}`);
          }
        });
      });
      setSelectedParams(initialSelected);
    };
    loadConfigs();
  }, [url]);

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

  // 计算最终 URL
  useEffect(() => {
    const allParams = configs.flatMap(config => config.params);
    const selected = allParams.filter(param => 
      selectedParams.has(`${param.key}=${param.value}`)
    );
    const newUrl = applyParamsToUrl(url, selected);
    setFinalUrl(newUrl);
  }, [url, configs, selectedParams]);

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

  // 获取所有可用的参数（去重）
  const allParams = configs.flatMap(config => config.params);
  const uniqueParams = Array.from(
    new Map(allParams.map(p => [`${p.key}=${p.value}`, p])).values()
  );

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
              <div className="qrcode-url-display" title={finalUrl}>
                {finalUrl}
              </div>
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

        {/* 右侧：参数列表 */}
        {uniqueParams.length > 0 && (
          <div className="qrcode-right">
            <div className="qrcode-params-label">
              {locale === 'zh' ? '参数选择' : 'Parameters'}
            </div>
            <div className="qrcode-params-scroll">
              <div className="qrcode-params-list">
                {uniqueParams.map((param, index) => {
                  const paramKey = `${param.key}=${param.value}`;
                  const isSelected = selectedParams.has(paramKey);
                  return (
                    <label
                      key={index}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeViewer;

