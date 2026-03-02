import React, { useState, useEffect } from 'react';
import { TimestampConverter } from '../../converters/TimestampConverter';
import { TimestampMatch } from '../utils/timestampScanner';
import { applyTimestampAdjustments } from '../utils/timestampAdjust';
import './TimestampAdjustModal.css';

interface TimestampAdjustModalProps {
  timestamp: TimestampMatch;
  onApply: (adjustedTimestamp: number) => void;
  onClose: () => void;
  locale?: 'zh' | 'en';
  /** 与 popup 选择的时区一致，用于显示/转换时间 */
  timezone?: string;
}

const TimestampAdjustModal: React.FC<TimestampAdjustModalProps> = ({
  timestamp,
  onApply,
  onClose,
  locale = 'zh',
  timezone
}) => {
  const [timeAdjustments, setTimeAdjustments] = useState({
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0
  });
  const [adjustedResult, setAdjustedResult] = useState<any>(null);
  const [originalTimestamp, setOriginalTimestamp] = useState<number>(timestamp.converted.unixMs);

  const converterOptions = timezone ? { timezone, includeRelative: false } : { includeRelative: false };

  useEffect(() => {
    // 初始化原始时间戳
    const originalTs = timestamp.converted.unixMs;
    setOriginalTimestamp(originalTs);
    const originalResult = TimestampConverter.fromTimestamp(originalTs, converterOptions);
    setAdjustedResult(originalResult);
    setTimeAdjustments({ year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 });
  }, [timestamp, timezone]);

  const handleTimeAdjustmentChange = (
    unit: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
    value: string
  ) => {
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
    try {
      const newTs = applyTimestampAdjustments(originalTimestamp, adjustments);
      const newResult = TimestampConverter.fromTimestamp(newTs, converterOptions);
      setAdjustedResult(newResult);
    } catch (err) {
      console.error('[TimestampAdjustModal] 调整时间失败:', err);
    }
  };

  const resetAdjustments = () => {
    setTimeAdjustments({ year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 });
    const originalResult = TimestampConverter.fromTimestamp(originalTimestamp, converterOptions);
    setAdjustedResult(originalResult);
  };

  const handleApply = () => {
    if (adjustedResult) {
      onApply(adjustedResult.unixMs);
      onClose();
    }
  };

  return (
    <div className="timestamp-adjust-modal-overlay" onClick={onClose}>
      <div className="timestamp-adjust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{locale === 'zh' ? '调整时间戳' : 'Adjust Timestamp'}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="adjust-section">
            <div className="adjust-header">
              <label>{locale === 'zh' ? '时间调整' : 'Time Adjustment'}</label>
              <button className="btn-reset" onClick={resetAdjustments}>
                {locale === 'zh' ? '重置' : 'Reset'}
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
                <span className="adjust-label">{locale === 'zh' ? '年' : 'Year'}</span>
              </div>
              <div className="adjust-input-group">
                <input
                  type="number"
                  value={timeAdjustments.month === 0 ? '' : timeAdjustments.month}
                  onChange={(e) => handleTimeAdjustmentChange('month', e.target.value)}
                  placeholder="0"
                  className="adjust-input"
                />
                <span className="adjust-label">{locale === 'zh' ? '月' : 'Month'}</span>
              </div>
              <div className="adjust-input-group">
                <input
                  type="number"
                  value={timeAdjustments.day === 0 ? '' : timeAdjustments.day}
                  onChange={(e) => handleTimeAdjustmentChange('day', e.target.value)}
                  placeholder="0"
                  className="adjust-input"
                />
                <span className="adjust-label">{locale === 'zh' ? '日' : 'Day'}</span>
              </div>
              <div className="adjust-input-group">
                <input
                  type="number"
                  value={timeAdjustments.hour === 0 ? '' : timeAdjustments.hour}
                  onChange={(e) => handleTimeAdjustmentChange('hour', e.target.value)}
                  placeholder="0"
                  className="adjust-input"
                />
                <span className="adjust-label">{locale === 'zh' ? '时' : 'Hour'}</span>
              </div>
              <div className="adjust-input-group">
                <input
                  type="number"
                  value={timeAdjustments.minute === 0 ? '' : timeAdjustments.minute}
                  onChange={(e) => handleTimeAdjustmentChange('minute', e.target.value)}
                  placeholder="0"
                  className="adjust-input"
                />
                <span className="adjust-label">{locale === 'zh' ? '分' : 'Minute'}</span>
              </div>
              <div className="adjust-input-group">
                <input
                  type="number"
                  value={timeAdjustments.second === 0 ? '' : timeAdjustments.second}
                  onChange={(e) => handleTimeAdjustmentChange('second', e.target.value)}
                  placeholder="0"
                  className="adjust-input"
                />
                <span className="adjust-label">{locale === 'zh' ? '秒' : 'Second'}</span>
              </div>
            </div>
            <div className="adjust-hint">
              <span>{locale === 'zh' ? '输入正数增加时间，负数减少时间' : 'Positive numbers add time, negative numbers subtract time'}</span>
            </div>
          </div>

          {adjustedResult && (
            <div className="adjusted-info">
              <label>{locale === 'zh' ? '调整后时间' : 'Adjusted Time'}</label>
              <div className="value-display adjusted-value">{adjustedResult.standard}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {locale === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button className="btn-apply" onClick={handleApply}>
            {locale === 'zh' ? '应用' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimestampAdjustModal;

