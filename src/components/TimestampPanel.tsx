import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { FloatWindow } from './FloatWindow';
import { Button } from './Button';
import { TimestampConverter } from '../converters/TimestampConverter';
import { ContentType } from '../types';
import { CalendarIcon, XIcon, CheckIcon, CopyIcon } from './Icons';
import { useI18n } from '../i18n/useI18n';
import './TimestampPanel.css';

/** 时间调整量，与 FloatWindowManager.TimeAdjustments 一致 */
export interface TimeAdjustmentsShape {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const ZERO_ADJUSTMENTS: TimeAdjustmentsShape = {
  year: 0,
  month: 0,
  day: 0,
  hour: 0,
  minute: 0,
  second: 0
};

interface TimestampPanelProps {
  value: string;
  type: ContentType;
  onClose: () => void;
  windowId?: string; // 窗口唯一ID，用于跨tab同步
  /** 用户输入或转换成功后回调，用于刷新后恢复 popup 内输入的内容 */
  onValueChange?: (value: string, contentType: ContentType) => void;
  /** 恢复时传入的时间调整量（刷新后恢复） */
  initialTimeAdjustments?: TimeAdjustmentsShape;
  /** 用户修改时间调整后回调，用于刷新后恢复 */
  onTimeAdjustmentsChange?: (adjustments: TimeAdjustmentsShape) => void;
}

const VALUE_SYNC_DEBOUNCE_MS = 500;
const TIME_ADJUSTMENTS_DEBOUNCE_MS = 400;

export const TimestampPanel: React.FC<TimestampPanelProps> = ({
  value,
  type,
  onClose,
  windowId,
  onValueChange,
  initialTimeAdjustments,
  onTimeAdjustmentsChange
}) => {
  console.log('[TimestampPanel] 组件渲染，props:', { value, type });
  const { t } = useI18n();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<string>('');
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);
  const [originalTimestamp, setOriginalTimestamp] = useState<number | null>(null);
  const [timeAdjustments, setTimeAdjustments] = useState<TimeAdjustmentsShape>(
    () => initialTimeAdjustments ?? ZERO_ADJUSTMENTS
  );
  const [inputValue, setInputValue] = useState(value || '');
  const lastResolvedTypeRef = useRef<ContentType>(type);

  // 当外部 value 变化时，同步到 inputValue
  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  // 用户输入时防抖回写快照（popup 内输入后刷新可恢复）
  useEffect(() => {
    if (!onValueChange || !windowId) return;
    const timer = window.setTimeout(() => {
      onValueChange(inputValue, lastResolvedTypeRef.current);
    }, VALUE_SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [inputValue, onValueChange, windowId]);

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
      lastResolvedTypeRef.current = type;
      setOriginalTimestamp(convertedResult.unixMs);
      const adj = initialTimeAdjustments ?? ZERO_ADJUSTMENTS;
      setTimeAdjustments(adj);
      const hasAdjustment =
        adj.year !== 0 ||
        adj.month !== 0 ||
        adj.day !== 0 ||
        adj.hour !== 0 ||
        adj.minute !== 0 ||
        adj.second !== 0;
      if (hasAdjustment) {
        let date = dayjs(convertedResult.unixMs);
        date = date
          .add(adj.year, 'year')
          .add(adj.month, 'month')
          .add(adj.day, 'day')
          .add(adj.hour, 'hour')
          .add(adj.minute, 'minute')
          .add(adj.second, 'second');
        const adjustedResult = TimestampConverter.fromTimestamp(date.valueOf(), { includeRelative: false });
        setResult(adjustedResult);
        setCurrentTimestamp(date.valueOf());
      } else {
        setResult(convertedResult);
        setCurrentTimestamp(convertedResult.unixMs);
      }
      setError('');
    } catch (err) {
      console.error('[TimestampPanel] 转换失败:', err);
      setError(err instanceof Error ? err.message : t('timestamp.convertFailed'));
      setResult(null);
      setCurrentTimestamp(null);
    }
  }, [value, type, initialTimeAdjustments]);

  // 时间调整变化时防抖回写快照（刷新后恢复）
  useEffect(() => {
    if (!onTimeAdjustmentsChange || !windowId) return;
    const timer = window.setTimeout(() => {
      onTimeAdjustmentsChange(timeAdjustments);
    }, TIME_ADJUSTMENTS_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [timeAdjustments, onTimeAdjustmentsChange, windowId]);

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

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
  };

  const handleInputConvert = async () => {
    if (!inputValue.trim()) {
      setError(t('timestamp.emptyInput'));
      return;
    }

    try {
      // 检测输入类型
      const { ContentDetector } = await import('../converters/ContentDetector');
      const detectionResult = ContentDetector.detect(inputValue.trim());
      
      if (detectionResult.type === ContentType.UNKNOWN || detectionResult.confidence < 0.5) {
        setError(t('errors.unrecognizedTimestamp'));
        return;
      }

      // 执行转换
      let convertedResult;
      if (detectionResult.type === ContentType.TIMESTAMP_SECOND ||
          detectionResult.type === ContentType.TIMESTAMP_MILLISECOND) {
        convertedResult = TimestampConverter.fromTimestamp(parseInt(inputValue.trim()), { includeRelative: false });
      } else {
        convertedResult = TimestampConverter.toTimestamp(inputValue.trim(), { includeRelative: false });
      }

      lastResolvedTypeRef.current = detectionResult.type;
      setResult(convertedResult);
      setCurrentTimestamp(convertedResult.unixMs);
      setOriginalTimestamp(convertedResult.unixMs);
      setTimeAdjustments({ year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 });
      setError('');
      onValueChange?.(inputValue.trim(), detectionResult.type);
    } catch (err) {
      console.error('[TimestampPanel] 转换失败:', err);
      setError(err instanceof Error ? err.message : t('timestamp.convertFailed'));
      setResult(null);
      setCurrentTimestamp(null);
    }
  };

  return (
    <FloatWindow
      title={<><CalendarIcon size={18} /> {t('timestamp.title')}</>}
      onClose={onClose}
      windowId={windowId}
      minWidth={400}
      minHeight={600}
    >
      <div className="timestamp-panel">
        {/* 当没有值或类型为UNKNOWN时，显示输入框 */}
        {(!value || type === ContentType.UNKNOWN) && !result ? (
          <div className="input-section">
            <label>{t('timestamp.inputLabel')}</label>
            <div className="input-group">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInputConvert();
                  }
                }}
                placeholder={t('timestamp.inputPlaceholder')}
                className="timestamp-input"
              />
              <Button onClick={handleInputConvert} variant="primary">
                {t('timestamp.convert')}
              </Button>
            </div>
            {error && (
              <div className="error-message">
                <XIcon size={16} /> {error}
              </div>
            )}
          </div>
        ) : (
          <>
            {(value || inputValue) && (
              <div className="original-value">
                <label>{t('timestamp.originalValue')}</label>
                <div className="value-display">{value || inputValue}</div>
              </div>
            )}

            {error && (
              <div className="error-message">
                <XIcon size={16} /> {error}
              </div>
            )}
          </>
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

