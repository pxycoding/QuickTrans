import dayjs from 'dayjs';

export interface TimestampAdjustments {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * 在原始时间戳（毫秒）上应用年/月/日/时/分/秒的增减，返回新的时间戳（毫秒）。
 * 与 TimestampAdjustModal 中的调整逻辑一致，便于单测与复用。
 */
export function applyTimestampAdjustments(
  originalMs: number,
  adjustments: TimestampAdjustments
): number {
  let date = dayjs(originalMs);
  date = date.add(adjustments.year, 'year');
  date = date.add(adjustments.month, 'month');
  date = date.add(adjustments.day, 'day');
  date = date.add(adjustments.hour, 'hour');
  date = date.add(adjustments.minute, 'minute');
  date = date.add(adjustments.second, 'second');
  return date.valueOf();
}
