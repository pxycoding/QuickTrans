import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { FloatWindow } from './FloatWindow';
import { Button } from './Button';
import { TimestampConverter } from '../converters/TimestampConverter';
import { ContentType } from '../types';
import { CalendarIcon, XIcon, CheckIcon, CopyIcon } from './Icons';
import { useI18n } from '../i18n/useI18n';
import './TimestampPanel.css';

interface TimestampPanelProps {
  value: string;
  type: ContentType;
  onClose: () => void;
  windowId?: string; // 窗口唯一ID，用于跨tab同步
}

export const TimestampPanel: React.FC<TimestampPanelProps> = ({
  value,
  type,
  onClose,
  windowId
}) => {
  console.log('[TimestampPanel] 组件渲染，props:', { value, type });
  const { t } = useI18n();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<string>('');
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const [originalTimestamp, setOriginalTimestamp] = useState<number | null>(null);
  const [timeAdjustments, setTimeAdjustments] = useState({
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0
  });

  useEffect(() => {
    console.log('[TimestampPanel] 开始转换，value:', value, 'type:', type);
    
    if (!value) {
      console.warn('[TimestampPanel] value 为空，跳过转换');
      return;
    }

    try {
      let convertedResult;

      if (type === ContentType.TIMESTAMP_SECOND ||
          type === ContentType.TIMESTAMP_MILLISECOND) {
        console.log('[TimestampPanel] 从时间戳转换');
        convertedResult = TimestampConverter.fromTimestamp(parseInt(value), { includeRelative: false });
      } else {
        console.log('[TimestampPanel] 从日期时间转换');
        convertedResult = TimestampConverter.toTimestamp(value, { includeRelative: false });
      }

      console.log('[TimestampPanel] 转换成功:', convertedResult);
      setResult(convertedResult);
      setCurrentTimestamp(convertedResult.unixMs);
      setOriginalTimestamp(convertedResult.unixMs);
      setTimeAdjustments({ year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 });
      setError('');
    } catch (err) {
      console.error('[TimestampPanel] 转换失败:', err);
      setError(err instanceof Error ? err.message : t('timestamp.convertFailed'));
      setResult(null);
      setCurrentTimestamp(null);
    }
  }, [value, type]);

  const handleTimeAdjustmentChange = (unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', value: string) => {
    // 如果输入为空，设置为 0
    if (value === '' || value === '-') {
      const newAdjustments = { ...timeAdjustments, [unit]: 0 };
      setTimeAdjustments(newAdjustments);
      applyTimeAdjustment(newAdjustments);
      return;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    const newAdjustments = { ...timeAdjustments, [unit]: numValue };
    setTimeAdjustments(newAdjustments);
    applyTimeAdjustment(newAdjustments);
  };

  const applyTimeAdjustment = (adjustments: typeof timeAdjustments) => {
    if (originalTimestamp === null) return;

    try {
      // 基于原始时间戳应用所有调整，避免累积错误
      let date = dayjs(originalTimestamp);

      // 应用所有调整（包括0值，dayjs的add方法可以处理0）
      date = date.add(adjustments.year, 'year');
      date = date.add(adjustments.month, 'month');
      date = date.add(adjustments.day, 'day');
      date = date.add(adjustments.hour, 'hour');
      date = date.add(adjustments.minute, 'minute');
      date = date.add(adjustments.second, 'second');

      const newTs = date.valueOf();
      const newResult = TimestampConverter.fromTimestamp(newTs, { includeRelative: false });
      setResult(newResult);
      setCurrentTimestamp(newTs);
      setError('');
    } catch (err) {
      console.error('[TimestampPanel] 调整时间失败:', err);
      setError(err instanceof Error ? err.message : t('timestamp.adjustFailed'));
    }
  };

  const resetAdjustments = () => {
    if (originalTimestamp === null) return;
    
    try {
      setTimeAdjustments({ year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 });
      const originalResult = TimestampConverter.fromTimestamp(originalTimestamp, { includeRelative: false });
      setResult(originalResult);
      setCurrentTimestamp(originalTimestamp);
      setError('');
    } catch (err) {
      console.error('[TimestampPanel] 重置失败:', err);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const allText = t('timestamp.copyAllText', {
      standard: result.standard,
      iso8601: result.iso8601,
      unix: result.unix.toString(),
      unixMs: result.unixMs.toString()
    });
    copyToClipboard(allText, 'all');
  };

  return (
    <FloatWindow
      title={<><CalendarIcon size={18} /> {t('timestamp.title')}</>}
      onClose={onClose}
      windowId={windowId}
    >
      <div className="timestamp-panel">
        <div className="original-value">
          <label>{t('timestamp.originalValue')}</label>
          <div className="value-display">{value}</div>
        </div>

        {error && (
          <div className="error-message">
            <XIcon size={16} /> {error}
          </div>
        )}

        {result && (
          <>
            <div className="adjust-section">
              <div className="adjust-header">
                <label>{t('timestamp.timeAdjustment')}</label>
                <button className="btn-reset" onClick={resetAdjustments} title={t('common.reset')}>
                  {t('common.reset')}
                </button>
              </div>
              <div className="adjust-inputs">
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.year === 0 ? '' : timeAdjustments.year}
                    onChange={(e) => handleTimeAdjustmentChange('year', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.year')}</span>
                </div>
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.month === 0 ? '' : timeAdjustments.month}
                    onChange={(e) => handleTimeAdjustmentChange('month', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.month')}</span>
                </div>
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.day === 0 ? '' : timeAdjustments.day}
                    onChange={(e) => handleTimeAdjustmentChange('day', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.day')}</span>
                </div>
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.hour === 0 ? '' : timeAdjustments.hour}
                    onChange={(e) => handleTimeAdjustmentChange('hour', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.hour')}</span>
                </div>
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.minute === 0 ? '' : timeAdjustments.minute}
                    onChange={(e) => handleTimeAdjustmentChange('minute', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.minute')}</span>
                </div>
                <div className="adjust-input-group">
                  <input
                    type="number"
                    value={timeAdjustments.second === 0 ? '' : timeAdjustments.second}
                    onChange={(e) => handleTimeAdjustmentChange('second', e.target.value)}
                    placeholder="0"
                    className="adjust-input"
                  />
                  <span className="adjust-label">{t('timestamp.second')}</span>
                </div>
              </div>
              <div className="adjust-hint">
                <span>{t('timestamp.adjustmentHint')}</span>
              </div>
            </div>

            <div className="result-section">
              <div className="result-item">
                <label>{t('timestamp.standardTime')}</label>
                <div className="value-display">
                  {result.standard}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(result.standard, 'standard')}
                    title={t('common.copy')}
                  >
                    {copied === 'standard' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>

              <div className="result-item">
                <label>{t('timestamp.iso8601')}</label>
                <div className="value-display">
                  {result.iso8601}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(result.iso8601, 'iso')}
                    title={t('common.copy')}
                  >
                    {copied === 'iso' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>

              <div className="result-item">
                <label>{t('timestamp.unixSecond')}</label>
                <div className="value-display">
                  {result.unix}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(result.unix.toString(), 'unix')}
                    title={t('common.copy')}
                  >
                    {copied === 'unix' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>

              <div className="result-item">
                <label>{t('timestamp.unixMillisecond')}</label>
                <div className="value-display">
                  {result.unixMs}
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(result.unixMs.toString(), 'unixMs')}
                    title={t('common.copy')}
                  >
                    {copied === 'unixMs' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <Button onClick={copyAll} variant="primary">
                <CopyIcon size={16} /> {t('common.copyAll')}
              </Button>
            </div>
          </>
        )}
      </div>
    </FloatWindow>
  );
};

