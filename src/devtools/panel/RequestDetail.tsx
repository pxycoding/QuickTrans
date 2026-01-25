import React, { useState, useEffect } from 'react';
import { requestCache, RequestMetadata } from '../utils/requestCache';
import { TimestampScanner, TimestampMatch } from '../utils/timestampScanner';
import { UrlExtractor, ExtractedUrl } from '../utils/urlExtractor';
import JsonViewer from './JsonViewer';
import QRCodeViewer from './QRCodeViewer';
import './RequestDetail.css';

interface RequestDetailProps {
  requestId: string;
  locale?: 'zh' | 'en';
}

type TabType = 'response' | 'request' | 'headers' | 'urls' | 'timestamps';

const RequestDetail: React.FC<RequestDetailProps> = ({ requestId, locale = 'zh' }) => {
  const [request, setRequest] = useState<RequestMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('response');
  const [loading, setLoading] = useState(false);
  const [timestamps, setTimestamps] = useState<TimestampMatch[]>([]);
  const [urls, setUrls] = useState<ExtractedUrl[]>([]);
  const [jsonData, setJsonData] = useState<any>(null);

  // 加载请求详情
  useEffect(() => {
    const loadRequest = async () => {
      const metadata = requestCache.getRequest(requestId);
      if (!metadata) {
        return;
      }

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
                
                const tsMatches = TimestampScanner.scanJson(parsed);
                setTimestamps(tsMatches);

                const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'response');
                setUrls(extractedUrls);
              } catch (e) {
                const tsMatches = TimestampScanner.scanText(loadedMetadata.responseBody);
                setTimestamps(tsMatches);

                const extractedUrls = UrlExtractor.extractFromText(loadedMetadata.responseBody, 'response');
                setUrls(extractedUrls);
              }
            }

            if (loadedMetadata.requestBody) {
              try {
                const parsed = JSON.parse(loadedMetadata.requestBody);
                const tsMatches = TimestampScanner.scanJson(parsed);
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
                const tsMatches = TimestampScanner.scanText(loadedMetadata.requestBody);
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
          
          // 扫描时间戳
          const tsMatches = TimestampScanner.scanJson(parsed);
          setTimestamps(tsMatches);

          // 提取URL
          const extractedUrls = UrlExtractor.extractFromJson(parsed, '', 'response');
          setUrls(extractedUrls);
        } catch (e) {
          // 不是JSON，尝试文本扫描
          const tsMatches = TimestampScanner.scanText(metadata.responseBody);
          setTimestamps(tsMatches);

          const extractedUrls = UrlExtractor.extractFromText(metadata.responseBody, 'response');
          setUrls(extractedUrls);
        }
      }

      // 处理request body
      if (metadata.requestBody) {
        try {
          const parsed = JSON.parse(metadata.requestBody);
          const tsMatches = TimestampScanner.scanJson(parsed);
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
          const tsMatches = TimestampScanner.scanText(metadata.requestBody);
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
        {locale === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  const tabs = [
    { id: 'response' as TabType, label: locale === 'zh' ? 'Response' : 'Response' },
    { id: 'request' as TabType, label: locale === 'zh' ? 'Request' : 'Request' },
    { id: 'headers' as TabType, label: locale === 'zh' ? 'Headers' : 'Headers' },
    { id: 'urls' as TabType, label: locale === 'zh' ? `URLs (${urls.length})` : `URLs (${urls.length})` },
    { id: 'timestamps' as TabType, label: locale === 'zh' ? `时间戳 (${timestamps.length})` : `Timestamps (${timestamps.length})` }
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
          <div className="loading">{locale === 'zh' ? '加载中...' : 'Loading...'}</div>
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
                    {locale === 'zh' ? '暂无响应内容' : 'No response content'}
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
                    {locale === 'zh' ? '暂无请求体' : 'No request body'}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'headers' && (
              <div className="tab-content">
                <div className="headers-section">
                  <h3>{locale === 'zh' ? '请求头' : 'Request Headers'}</h3>
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
                  <h3>{locale === 'zh' ? '响应头' : 'Response Headers'}</h3>
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
                      {locale === 'zh' ? '未找到URL' : 'No URLs found'}
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
                      {locale === 'zh' ? '未找到时间戳' : 'No timestamps found'}
                    </div>
                  ) : (
                    <table className="timestamps-table">
                      <thead>
                        <tr>
                          <th>{locale === 'zh' ? '路径' : 'Path'}</th>
                          <th>{locale === 'zh' ? '原始值' : 'Original'}</th>
                          <th>{locale === 'zh' ? '标准时间' : 'Standard Time'}</th>
                          <th>{locale === 'zh' ? '相对时间' : 'Relative'}</th>
                          <th>{locale === 'zh' ? '操作' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timestamps.map((ts, idx) => (
                          <tr key={idx}>
                            <td className="timestamp-path">{ts.path}</td>
                            <td className="timestamp-original">{String(ts.originalValue)}</td>
                            <td className="timestamp-standard">{ts.converted.standard}</td>
                            <td className="timestamp-relative">{ts.converted.relative || '-'}</td>
                            <td className="timestamp-actions">
                              <button
                                onClick={() => navigator.clipboard.writeText(ts.converted.standard)}
                                className="copy-btn"
                              >
                                {locale === 'zh' ? '复制' : 'Copy'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RequestDetail;

