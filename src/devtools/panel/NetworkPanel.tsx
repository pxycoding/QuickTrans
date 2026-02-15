import React, { useState, useEffect, useCallback } from 'react';
import { requestCache, RequestMetadata } from '../utils/requestCache';
import { TimestampScanner, TimestampMatch } from '../utils/timestampScanner';
import { UrlExtractor, ExtractedUrl } from '../utils/urlExtractor';
import RequestList from './RequestList';
import RequestDetail from './RequestDetail';
import './NetworkPanel.css';

interface NetworkPanelProps {
  locale?: 'zh' | 'en';
}

const NetworkPanel: React.FC<NetworkPanelProps> = ({ locale = 'zh' }) => {
  const [requests, setRequests] = useState<RequestMetadata[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // 更新请求列表
  const updateRequests = useCallback(() => {
    let filtered = requestCache.getAllRequests();
    
    // 搜索过滤
    if (searchQuery) {
      filtered = requestCache.searchRequests(searchQuery);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      const statusCode = parseInt(filterStatus);
      filtered = filtered.filter(r => r.status === statusCode);
    }

    setRequests(filtered);
  }, [searchQuery, filterStatus]);

  // 监听网络请求
  useEffect(() => {
    if (isPaused) {
      return;
    }

    const handler = (request: chrome.devtools.network.Request) => {
      requestCache.addRequest(request);
      updateRequests();
    };

    chrome.devtools.network.onRequestFinished.addListener(handler);

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handler);
    };
  }, [isPaused, updateRequests]);

  // 初始加载
  useEffect(() => {
    updateRequests();
  }, [updateRequests]);

  // 检查样式是否正确应用
  useEffect(() => {
    console.log('[QuickTrans Panel] NetworkPanel component mounted');
    
    // 延迟检查，确保 DOM 已渲染
    setTimeout(() => {
      const panel = document.querySelector('.network-panel');
      if (panel) {
        const computed = window.getComputedStyle(panel);
        console.log('[QuickTrans Panel] NetworkPanel computed styles:', {
          backgroundColor: computed.backgroundColor,
          background: computed.background,
          backdropFilter: computed.backdropFilter,
          WebkitBackdropFilter: computed.getPropertyValue('-webkit-backdrop-filter'),
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          color: computed.color
        });
        
        // 检查关键样式类
        const header = document.querySelector('.network-panel-header');
        if (header) {
          const headerComputed = window.getComputedStyle(header);
          console.log('[QuickTrans Panel] Header computed styles:', {
            backgroundColor: headerComputed.backgroundColor,
            backdropFilter: headerComputed.backdropFilter,
            padding: headerComputed.padding,
            borderRadius: headerComputed.borderRadius
          });
        }
        
        // 检查输入框样式
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          const inputComputed = window.getComputedStyle(searchInput);
          console.log('[QuickTrans Panel] Search input computed styles:', {
            backgroundColor: inputComputed.backgroundColor,
            borderRadius: inputComputed.borderRadius,
            padding: inputComputed.padding,
            border: inputComputed.border
          });
        }
      } else {
        console.warn('[QuickTrans Panel] ⚠ NetworkPanel element not found in DOM');
      }
    }, 300);
  }, []);

  // 选择请求
  const handleSelectRequest = async (requestId: string) => {
    setSelectedRequestId(requestId);
    
    // 按需加载请求内容
    const metadata = requestCache.getRequest(requestId);
    if (metadata && !metadata.bodyLoaded) {
      // 需要从 DevTools API 获取请求对象
      // 这里我们会在 RequestDetail 组件中处理加载
    }
  };

  // 清空请求
  const handleClear = () => {
    if (confirm(locale === 'zh' ? '确定要清空所有请求记录吗？' : 'Are you sure you want to clear all requests?')) {
      requestCache.clear();
      setRequests([]);
      setSelectedRequestId(null);
    }
  };

  return (
    <div className="network-panel">
      <div className="network-panel-header">
        <div className="header-left">
          <h2>QuickTrans Network</h2>
          <span className="request-count">
            {requests.length} {locale === 'zh' ? '条请求' : 'requests'}
          </span>
        </div>
        <div className="header-actions">
          <input
            type="text"
            placeholder={locale === 'zh' ? '搜索URL、方法、状态码...' : 'Search URL, method, status...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">{locale === 'zh' ? '全部状态' : 'All Status'}</option>
            <option value="200">200 OK</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Error</option>
          </select>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
          >
            {isPaused ? (locale === 'zh' ? '▶ 继续' : '▶ Resume') : (locale === 'zh' ? '⏸ 暂停' : '⏸ Pause')}
          </button>
          <button onClick={handleClear} className="clear-btn">
            {locale === 'zh' ? '清空' : 'Clear'}
          </button>
        </div>
      </div>
      <div className="network-panel-content">
        <div className="request-list-container">
          <RequestList
            requests={requests}
            selectedRequestId={selectedRequestId}
            onSelectRequest={handleSelectRequest}
            locale={locale}
          />
        </div>
        <div className="request-detail-container">
          {selectedRequestId ? (
            <RequestDetail
              requestId={selectedRequestId}
              locale={locale}
            />
          ) : (
            <div className="empty-detail">
              {locale === 'zh' ? '选择一个请求查看详情' : 'Select a request to view details'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkPanel;

