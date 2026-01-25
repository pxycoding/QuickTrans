import React, { useState } from 'react';
import { TimestampMatch } from '../utils/timestampScanner';
import './JsonViewer.css';

interface JsonViewerProps {
  data: any;
  timestamps: TimestampMatch[];
  locale?: 'zh' | 'en';
  level?: number;
  path?: string;
}

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  timestamps,
  locale = 'zh',
  level = 0,
  path = ''
}) => {
  const [expanded, setExpanded] = useState(level < 2); // 默认展开前2层

  // 查找当前路径的时间戳
  const findTimestamp = (currentPath: string): TimestampMatch | undefined => {
    return timestamps.find(ts => ts.path === currentPath);
  };

  const timestamp = findTimestamp(path);

  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (data === undefined) {
    return <span className="json-undefined">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{String(data)}</span>;
  }

  if (typeof data === 'number') {
    const ts = timestamp;
    return (
      <span className="json-number">
        {data}
        {ts && (
          <span className="timestamp-annotation" title={ts.converted.standard}>
            {' '}→ {ts.converted.standard}
            {ts.converted.relative && ` (${ts.converted.relative})`}
          </span>
        )}
      </span>
    );
  }

  if (typeof data === 'string') {
    const ts = timestamp;
    // 检查是否是时间戳字符串
    if (ts) {
      return (
        <span className="json-string">
          "{data}"
          <span className="timestamp-annotation" title={ts.converted.standard}>
            {' '}→ {ts.converted.standard}
            {ts.converted.relative && ` (${ts.converted.relative})`}
          </span>
        </span>
      );
    }
    return <span className="json-string">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-array-empty">[]</span>;
    }

    return (
      <div className="json-array">
        <button
          className="json-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '−' : '+'}
        </button>
        <span className="json-bracket">[</span>
        {expanded && (
          <div className="json-content">
            {data.map((item, index) => {
              const itemPath = path ? `${path}[${index}]` : `[${index}]`;
              return (
                <div key={index} className="json-item">
                  <JsonViewer
                    data={item}
                    timestamps={timestamps}
                    locale={locale}
                    level={level + 1}
                    path={itemPath}
                  />
                  {index < data.length - 1 && <span className="json-comma">,</span>}
                </div>
              );
            })}
          </div>
        )}
        {!expanded && <span className="json-collapsed">... {data.length} items</span>}
        <span className="json-bracket">]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="json-object-empty">{'{}'}</span>;
    }

    return (
      <div className="json-object">
        <button
          className="json-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '−' : '+'}
        </button>
        <span className="json-brace">{'{'}</span>
        {expanded && (
          <div className="json-content">
            {keys.map((key, index) => {
              const itemPath = path ? `${path}.${key}` : key;
              return (
                <div key={key} className="json-item">
                  <span className="json-key">"{key}"</span>
                  <span className="json-colon">: </span>
                  <JsonViewer
                    data={data[key]}
                    timestamps={timestamps}
                    locale={locale}
                    level={level + 1}
                    path={itemPath}
                  />
                  {index < keys.length - 1 && <span className="json-comma">,</span>}
                </div>
              );
            })}
          </div>
        )}
        {!expanded && <span className="json-collapsed">... {keys.length} keys</span>}
        <span className="json-brace">{'}'}</span>
      </div>
    );
  }

  return <span>{String(data)}</span>;
};

export default JsonViewer;

