import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useI18n } from '../../i18n/useI18n';
import { requestCache, RequestMetadata } from '../utils/requestCache';
import { TimestampScanner, TimestampMatch } from '../utils/timestampScanner';
import { UrlExtractor, ExtractedUrl } from '../utils/urlExtractor';
import RequestList from './RequestList';
import RequestDetail from './RequestDetail';
import './NetworkPanel.css';

const NetworkPanel: React.FC = () => {
  const { t, locale, setLocale } = useI18n();
  const [requests, setRequests] = useState<RequestMetadata[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    
    // 如果搜索后只有一个结果，自动选中
    if (searchQuery && filtered.length === 1) {
      setSelectedRequestId(filtered[0].requestId);
    }
  }, [searchQuery, filterStatus]);

  // 监听网络请求（仅捕获 fetch 和 xhr）
  useEffect(() => {
    if (isPaused) {
      return;
    }

    const handler = (request: chrome.devtools.network.Request) => {
      // 只处理 fetch 和 xhr 类型的请求
      const requestType = (request as any).type?.toLowerCase();
      if (requestType === 'fetch' || requestType === 'xhr') {
        requestCache.addRequest(request);
        updateRequests();
      }
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
    if (confirm(t('network.clearConfirm'))) {
      requestCache.clear();
      setRequests([]);
      setSelectedRequestId(null);
    }
  };

  // 添加 mock 请求（用于测试时间戳）
  const handleAddMockRequest = () => {
    const mockRequestId = requestCache.addMockRequest();
    updateRequests();
    setSelectedRequestId(mockRequestId);
  };


  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F 聚焦搜索框
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="network-panel">
      <div className="network-panel-header">
        <div className="header-left">
          <h2>
            {t('network.title')}
            <Tooltip title={t('network.filterInfo')}>
              <InfoCircleOutlined className="filter-info-icon" />
            </Tooltip>
          </h2>
          <span className="request-count">
            {requests.length} {t('network.requests')}
          </span>
        </div>
        <div className="header-actions">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('network.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">{t('network.allStatus')}</option>
            <option value="200">200 OK</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Error</option>
          </select>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
          >
            {isPaused ? t('network.resume') : t('network.pause')}
          </button>
          {/* <button onClick={handleAddMockRequest} className="mock-btn" title={t('network.mockTooltip')}>
            {t('network.mock')}
          </button> */}
          <button onClick={handleClear} className="clear-btn">
            {t('network.clear')}
          </button>
          <div className="language-selector">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'zh' | 'en')}
              className="language-select"
            >
              <option value="zh">{t('language.zh')}</option>
              <option value="en">{t('language.en')}</option>
            </select>
          </div>
        </div>
      </div>
      <div className="network-panel-content">
        <div className="request-list-container">
          <RequestList
            requests={requests}
            selectedRequestId={selectedRequestId}
            onSelectRequest={handleSelectRequest}
          />
        </div>
        <div className="request-detail-container">
          {selectedRequestId ? (
            <RequestDetail
              requestId={selectedRequestId}
            />
          ) : (
            <div className="empty-detail">
              {t('network.selectRequest')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkPanel;

