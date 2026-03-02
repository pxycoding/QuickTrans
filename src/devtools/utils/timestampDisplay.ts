import { TimestampConverter } from '../../converters/TimestampConverter';
import type { TimestampMatch } from './timestampScanner';

export interface TimestampRowDisplay {
  displayValue: string;
  displayStandard: string;
  isAdjusted: boolean;
}

/**
 * 计算时间戳列表某一行的展示值（原始列、标准时间列、是否已调整）。
 * 当存在调整值时，根据原始值为秒级还是毫秒级决定显示秒或毫秒。
 */
export function getTimestampRowDisplay(
  ts: TimestampMatch,
  adjustedMs?: number,
  timezone?: string
): TimestampRowDisplay {
  if (adjustedMs === undefined) {
    return {
      displayValue: String(ts.originalValue),
      displayStandard: ts.converted.standard,
      isAdjusted: false
    };
  }
  const originalStr = String(ts.originalValue);
  const isSeconds =
    originalStr.length === 10 ||
    (typeof ts.originalValue === 'number' && ts.originalValue < 10000000000);
  const displayValue = isSeconds
    ? Math.floor(adjustedMs / 1000).toString()
    : adjustedMs.toString();
  const adjustedResult = TimestampConverter.fromTimestamp(adjustedMs, {
    timezone,
    includeRelative: false
  });
  return {
    displayValue,
    displayStandard: adjustedResult.standard,
    isAdjusted: true
  };
}
