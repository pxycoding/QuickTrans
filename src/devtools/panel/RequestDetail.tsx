import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { requestCache, RequestMetadata } from '../utils/requestCache';
import { TimestampScanner, TimestampMatch } from '../utils/timestampScanner';
import { UrlExtractor, ExtractedUrl } from '../utils/urlExtractor';
import { TimestampConverter } from '../../converters/TimestampConverter';
import { getStoredTimezone, getCurrentTimezone } from '../../utils/timezone';
import { getTimestampRowDisplay } from '../utils/timestampDisplay';
import JsonViewer from './JsonViewer';
import QRCodeViewer from './QRCodeViewer';
import TimestampAdjustModal from './TimestampAdjustModal';
import './RequestDetail.css';

interface RequestDetailProps {
  requestId: string;
}

type TabType = 'response' | 'request' | 'headers' | 'urls' | 'timestamps';

const RequestDetail: React.FC<RequestDetailProps> = ({ requestId }) => {
  const { t, locale } = useI18n();
  const [request, setRequest] = useState<RequestMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('response');
  const [loading, setLoading] = useState(false);
  const [timestamps, setTimestamps] = useState<TimestampMatch[]>([]);
  const [urls, setUrls] = useState<ExtractedUrl[]>([]);
  const [jsonData, setJsonData] = useState<any>(null);
  const [adjustingTimestampIndex, setAdjustingTimestampIndex] = useState<number | null>(null);
  const [adjustedTimestamps, setAdjustedTimestamps] = useState<Map<number, number>>(new Map());
  const [timezone, setTimezone] = useState<string>(() => getCurrentTimezone());

  // 切换请求时清空当前请求的时间戳调整状态，避免不同请求共用 index 导致误显示“已调整”
  useEffect(() => {
    setAdjustedTimestamps(new Map());
  }, [requestId]);

  // 加载请求详情
  useEffect(() => {
    const loadRequest = async () => {
      const metadata = requestCache.getRequest(requestId);
      if (!metadata) {
        return;
      }

      const tz = await getStoredTimezone();
      setTimezone(tz);

      setRequest(metadata);

      // 如果body未加载，尝试加载
      if (!metadata.bodyLoaded) {
        setLoading(true);
        try {
          const loadedMetadata = await requestCache.loadContentFromRequest(requestId);
          if (loadedMetadata) {
            setRequest(loadedMetadata);
            
            // 重新解析JSON并扫描
            if (loadedMetadata.responseBody) {
              try {
                const parsed = JSON.parse(loadedMetadata.responseBody);
                setJsonData(parsed);
                
                const tsMatches = TimestampScanner.scanJson(parsed, '', { timezone: tz });
                setTimestamps(tsMatches);

                const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'response');
                setUrls(extractedUrls);
              } catch (e) {
                const tsMatches = TimestampScanner.scanText(loadedMetadata.responseBody, { timezone: tz });
                setTimestamps(tsMatches);

                const extractedUrls = UrlExtractor.extractFromText(loadedMetadata.responseBody, 'response');
                setUrls(extractedUrls);
              }
            }

            if (loadedMetadata.requestBody) {
              try {
                const parsed = JSON.parse(loadedMetadata.requestBody);
                const tsMatches = TimestampScanner.scanJson(parsed, '', { timezone: tz });
                setTimestamps(prev => [...prev, ...tsMatches]);

                const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'request');
                setUrls(prev => {
                  const combined = [...prev, ...extractedUrls];
                  const unique = new Map<string, ExtractedUrl>();
                  combined.forEach(u => {
                    if (!unique.has(u.url)) {
                      unique.set(u.url, u);
                    }
                  });
                  return Array.from(unique.values());
                });
              } catch (e) {
                const tsMatches = TimestampScanner.scanText(loadedMetadata.requestBody, { timezone: tz });
                setTimestamps(prev => [...prev, ...tsMatches]);

                const extractedUrls = UrlExtractor.extractFromText(loadedMetadata.requestBody, 'request');
                setUrls(prev => {
                  const combined = [...prev, ...extractedUrls];
                  const unique = new Map<string, ExtractedUrl>();
                  combined.forEach(u => {
                    if (!unique.has(u.url)) {
                      unique.set(u.url, u);
                    }
                  });
                  return Array.from(unique.values());
                });
              }
            }

            // 添加请求URL本身
            if (loadedMetadata.url) {
              setUrls(prev => {
                const exists = prev.some(u => u.url === loadedMetadata.url);
                if (!exists) {
                  return [...prev, { url: loadedMetadata.url, source: 'request' }];
                }
                return prev;
              });
            }
          }
        } catch (error) {
          console.error('Failed to load request content:', error);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 解析JSON并扫描时间戳和URL
      if (metadata.responseBody) {
        try {
          const parsed = JSON.parse(metadata.responseBody);
          setJsonData(parsed);
          
          // 扫描时间戳（使用 popup 选择的时区）
          const tsMatches = TimestampScanner.scanJson(parsed, '', { timezone: tz });
          setTimestamps(tsMatches);

          // 提取URL
          const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'response');
          setUrls(extractedUrls);
        } catch (e) {
          // 不是JSON，尝试文本扫描
          const tsMatches = TimestampScanner.scanText(metadata.responseBody, { timezone: tz });
          setTimestamps(tsMatches);

          const extractedUrls = UrlExtractor.extractFromText(metadata.responseBody, 'response');
          setUrls(extractedUrls);
        }
      }

      // 处理request body
      if (metadata.requestBody) {
        try {
          const parsed = JSON.parse(metadata.requestBody);
          const tsMatches = TimestampScanner.scanJson(parsed, '', { timezone: tz });
          setTimestamps(prev => [...prev, ...tsMatches]);

          const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'request');
          setUrls(prev => {
            const combined = [...prev, ...extractedUrls];
            // 去重
            const unique = new Map<string, ExtractedUrl>();
            combined.forEach(u => {
              if (!unique.has(u.url)) {
                unique.set(u.url, u);
              }
            });
            return Array.from(unique.values());
          });
        } catch (e) {
          const tsMatches = TimestampScanner.scanText(metadata.requestBody, { timezone: tz });
          setTimestamps(prev => [...prev, ...tsMatches]);

          const extractedUrls = UrlExtractor.extractFromText(metadata.requestBody, 'request');
          setUrls(prev => {
            const combined = [...prev, ...extractedUrls];
            const unique = new Map<string, ExtractedUrl>();
            combined.forEach(u => {
              if (!unique.has(u.url)) {
                unique.set(u.url, u);
              }
            });
            return Array.from(unique.values());
          });
        }
      }

      // 添加请求URL本身
      if (metadata.url) {
        setUrls(prev => {
          const exists = prev.some(u => u.url === metadata.url);
          if (!exists) {
            return [...prev, { url: metadata.url, source: 'request' }];
          }
          return prev;
        });
      }
    };

    loadRequest();
  }, [requestId]);

  if (!request) {
    return (
      <div className="request-detail-empty">
        {t('network.loading')}
      </div>
    );
  }

  const tabs = [
    { id: 'response' as TabType, label: t('network.response') },
    { id: 'request' as TabType, label: t('network.request') },
    { id: 'headers' as TabType, label: t('network.headers') },
    { id: 'urls' as TabType, label: `${t('network.urls')} (${urls.length})` },
    { id: 'timestamps' as TabType, label: `${t('network.timestamps')} (${timestamps.length})` }
  ];

  return (
    <div className="request-detail">
      <div className="request-detail-header">
        <div className="request-info">
          <span className="method">{request.method}</span>
          <span className="url" title={request.url}>{request.url}</span>
          <span className={`status status-${Math.floor(request.status / 100)}xx`}>
            {request.status} {request.statusText}
          </span>
        </div>
      </div>
      <div className="request-detail-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="request-detail-content">
        {loading ? (
          <div className="loading">{t('network.loading')}</div>
        ) : (
          <>
            {activeTab === 'response' && (
              <div className="tab-content">
                {request.responseBody ? (
                  jsonData ? (
                    <JsonViewer data={jsonData} timestamps={timestamps} locale={locale} />
                  ) : (
                    <pre className="raw-content">{request.responseBody}</pre>
                  )
                ) : (
                  <div className="empty-content">
                    {t('network.noResponseContent')}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'request' && (
              <div className="tab-content">
                {request.requestBody ? (
                  <pre className="raw-content">{request.requestBody}</pre>
                ) : (
                  <div className="empty-content">
                    {t('network.noRequestBody')}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'headers' && (
              <div className="tab-content">
                <div className="headers-section">
                  <h3>{t('network.requestHeaders')}</h3>
                  {request.requestHeaders ? (
                    <table className="headers-table">
                      <tbody>
                        {request.requestHeaders.map((header, idx) => (
                          <tr key={idx}>
                            <td className="header-name">{header.name}</td>
                            <td className="header-value">{header.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-content">-</div>
                  )}
                </div>
                <div className="headers-section">
                  <h3>{t('network.responseHeaders')}</h3>
                  {request.responseHeaders ? (
                    <table className="headers-table">
                      <tbody>
                        {request.responseHeaders.map((header, idx) => (
                          <tr key={idx}>
                            <td className="header-name">{header.name}</td>
                            <td className="header-value">{header.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-content">-</div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'urls' && (
              <div className="tab-content">
                <div className="url-list">
                  {urls.length === 0 ? (
                    <div className="empty-content">
                      {t('network.noUrls')}
                    </div>
                  ) : (
                    urls.map((urlInfo, idx) => (
                      <div key={idx} className="url-item">
                        <div className="url-header">
                          <span className="url-source">{urlInfo.source}</span>
                          {urlInfo.path && <span className="url-path">{urlInfo.path}</span>}
                        </div>
                        <div className="url-value" title={urlInfo.url}>{urlInfo.url}</div>
                        <QRCodeViewer url={urlInfo.url} locale={locale} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {activeTab === 'timestamps' && (
              <div className="tab-content">
                <div className="timestamps-list">
                  {timestamps.length === 0 ? (
                    <div className="empty-content">
                      {t('network.noTimestamps')}
                    </div>
                  ) : (
                    <table className="timestamps-table">
                      <thead>
                        <tr>
                          <th>{t('network.path')}</th>
                          <th>{t('network.original')}</th>
                          <th>{t('network.standardTime')}</th>
                          <th>{t('network.relative')}</th>
                          <th>{t('network.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timestamps.map((ts, idx) => {
                          const adjustedTimestamp = adjustedTimestamps.get(idx);
                          const { displayValue, displayStandard, isAdjusted } = getTimestampRowDisplay(
                            ts,
                            adjustedTimestamp,
                            timezone
                          );
                          return (
                            <tr key={idx}>
                              <td className="timestamp-path">{ts.path}</td>
                              <td className={`timestamp-original ${isAdjusted ? 'adjusted' : ''}`}>
                                {displayValue}
                              </td>
                              <td className={`timestamp-standard ${isAdjusted ? 'adjusted' : ''}`}>
                                {displayStandard}
                              </td>
                              <td className="timestamp-relative">{ts.converted.relative || '-'}</td>
                              <td className="timestamp-actions">
                                <button
                                  onClick={() => setAdjustingTimestampIndex(idx)}
                                  className="adjust-btn"
                                >
                                  {t('network.adjust')}
                                </button>
                                {isAdjusted && (
                                  <button
                                    onClick={() => {
                                      setAdjustedTimestamps(prev => {
                                        const next = new Map(prev);
                                        next.delete(idx);
                                        return next;
                                      });
                                    }}
                                    className="restore-btn"
                                  >
                                    {t('network.restore')}
                                  </button>
                                )}
                                <button
                                  onClick={() => navigator.clipboard.writeText(displayStandard)}
                                  className="copy-btn"
                                >
                                  {t('network.copy')}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
                {adjustingTimestampIndex !== null && (
                  <TimestampAdjustModal
                    timestamp={timestamps[adjustingTimestampIndex]}
                    onApply={(adjustedTimestamp) => {
                      const newAdjusted = new Map(adjustedTimestamps);
                      newAdjusted.set(adjustingTimestampIndex, adjustedTimestamp);
                      setAdjustedTimestamps(newAdjusted);
                      setAdjustingTimestampIndex(null);
                    }}
                    onClose={() => setAdjustingTimestampIndex(null)}
                    locale={locale}
                    timezone={timezone}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RequestDetail;

