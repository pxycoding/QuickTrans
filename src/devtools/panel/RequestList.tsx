import React from 'react';
import { useI18n } from '../../i18n/useI18n';
import { RequestMetadata } from '../utils/requestCache';
import './RequestList.css';

interface RequestListProps {
  requests: RequestMetadata[];
  selectedRequestId: string | null;
  onSelectRequest: (requestId: string) => void;
}

const RequestList: React.FC<RequestListProps> = ({
  requests,
  selectedRequestId,
  onSelectRequest
}) => {
  const { t } = useI18n();
  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return '#4caf50';
    if (status >= 300 && status < 400) return '#2196f3';
    if (status >= 400 && status < 500) return '#ff9800';
    if (status >= 500) return '#f44336';
    return '#999';
  };

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      DELETE: '#f93e3e',
      PATCH: '#50e3c2'
    };
    return colors[method] || '#999';
  };

  const formatUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  };

  return (
    <div className="request-list">
      {requests.length === 0 ? (
        <div className="empty-list">
          {t('network.noRequests')}
        </div>
      ) : (
        <div className="request-items">
          {requests.map((request) => (
            <div
              key={request.requestId}
              data-request-id={request.requestId}
              className={`request-item ${selectedRequestId === request.requestId ? 'selected' : ''}`}
              onClick={() => onSelectRequest(request.requestId)}
            >
              <div className="request-item-header">
                <span
                  className="method-badge"
                  style={{ backgroundColor: getMethodColor(request.method) }}
                >
                  {request.method}
                </span>
                <span
                  className="status-badge"
                  style={{ color: getStatusColor(request.status) }}
                >
                  {request.status}
                </span>
                <span className="request-time">
                  {request.time ? `${request.time.toFixed(0)}ms` : ''}
                </span>
              </div>
              <div className="request-url" title={request.url}>
                {formatUrl(request.url)}
              </div>
              {request.mimeType && (
                <div className="request-type">
                  {request.mimeType.split(';')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestList;

