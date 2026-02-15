import React, { useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import './Tools.css';

export const Tools: React.FC = () => {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleOpenTimestampPanel = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        setError('无法获取当前标签页，请确保已打开网页');
        setIsProcessing(false);
        return;
      }

      const tab = tabs[0];
      const tabId = tab.id;

      // 再次检查 tabId（TypeScript 类型保护）
      if (!tabId) {
        setError('无法获取当前标签页，请确保已打开网页');
        setIsProcessing(false);
        return;
      }

      // 检查是否是支持的 URL（排除 chrome://, edge:// 等特殊页面）
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
        setError('无法在此页面使用，请打开普通网页');
        setIsProcessing(false);
        return;
      }

      // 发送消息打开时间戳转换面板（传入空值，让用户在面板中输入）
      await chrome.tabs.sendMessage(tabId, {
        type: 'CONVERT_TIMESTAMP',
        payload: {
          selectionText: '' // 空值，让用户在面板中输入
        }
      });
    } catch (error) {
      console.error('打开时间戳面板失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Receiving end does not exist')) {
        setError('无法连接到页面，请刷新页面后重试');
      } else {
        setError('打开失败，请确保已打开网页');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenQRCodePanel = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        setError('无法获取当前标签页，请确保已打开网页');
        setIsProcessing(false);
        return;
      }

      const tab = tabs[0];
      const tabId = tab.id;

      // 再次检查 tabId（TypeScript 类型保护）
      if (!tabId) {
        setError('无法获取当前标签页，请确保已打开网页');
        setIsProcessing(false);
        return;
      }

      // 检查是否是支持的 URL（排除 chrome://, edge:// 等特殊页面）
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
        setError('无法在此页面使用，请打开普通网页');
        setIsProcessing(false);
        return;
      }

      // 发送消息打开二维码生成面板（传入空值，让用户在面板中输入）
      await chrome.tabs.sendMessage(tabId, {
        type: 'GENERATE_QRCODE',
        payload: {
          selectionText: '' // 空值，让用户在面板中输入
        }
      });
    } catch (error) {
      console.error('打开二维码面板失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Receiving end does not exist')) {
        setError('无法连接到页面，请刷新页面后重试');
      } else {
        setError('打开失败，请确保已打开网页');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="tools-page">
      <div className="feature-list">
        <div 
          className="feature-item clickable"
          onClick={handleOpenTimestampPanel}
        >
          <div className="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="feature-content">
            <h3>{t('features.timestamp.title')}</h3>
          </div>
        </div>

        <div 
          className="feature-item clickable"
          onClick={handleOpenQRCodePanel}
        >
          <div className="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="feature-content">
            <h3>{t('features.qrcodeGenerate.title')}</h3>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
};

