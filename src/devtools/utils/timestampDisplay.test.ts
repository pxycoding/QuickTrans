import { describe, it, expect } from 'vitest';
import { getTimestampRowDisplay } from './timestampDisplay';
import type { TimestampMatch } from './timestampScanner';

function makeMatch(
  overrides: Partial<TimestampMatch> & { originalValue: number | string; path: string }
): TimestampMatch {
  const { path, originalValue, ...rest } = overrides;
  const raw = originalValue;
  const unixMs =
    typeof raw === 'number'
      ? raw < 10000000000
        ? raw * 1000
        : raw
      : String(raw).length <= 10
        ? Number(raw) * 1000
        : Number(raw);
  return {
    ...rest,
    path,
    originalValue,
    converted: {
      standard: '2024-01-01 08:00:00',
      iso8601: '2024-01-01T08:00:00+08:00',
      unix: Math.floor(unixMs / 1000),
      unixMs
    },
    type: 'number'
  };
}

describe('getTimestampRowDisplay', () => {
  it('无调整时应返回原始值和 converted.standard', () => {
    const ts = makeMatch({
      path: 'createdAt',
      originalValue: 1704067200000
    });
    const result = getTimestampRowDisplay(ts);
    expect(result.isAdjusted).toBe(false);
    expect(result.displayValue).toBe('1704067200000');
    expect(result.displayStandard).toBe('2024-01-01 08:00:00');
  });

  it('无调整时秒级时间戳应原样显示', () => {
    const ts = makeMatch({
      path: 'ts',
      originalValue: 1704067200
    });
    const result = getTimestampRowDisplay(ts);
    expect(result.isAdjusted).toBe(false);
    expect(result.displayValue).toBe('1704067200');
  });

  it('已调整且原始为毫秒级时 displayValue 应为调整后的毫秒字符串', () => {
    const ts = makeMatch({
      path: 'createdAt',
      originalValue: 1704067200000
    });
    const adjustedMs = 1704153600000; // +1 天
    const result = getTimestampRowDisplay(ts, adjustedMs, 'UTC');
    expect(result.isAdjusted).toBe(true);
    expect(result.displayValue).toBe('1704153600000');
    expect(result.displayStandard).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('已调整且原始为秒级时 displayValue 应为调整后的秒数字符串', () => {
    const ts = makeMatch({
      path: 'ts',
      originalValue: 1704067200
    });
    const adjustedMs = 1704153600000; // 毫秒
    const result = getTimestampRowDisplay(ts, adjustedMs, 'UTC');
    expect(result.isAdjusted).toBe(true);
    expect(result.displayValue).toBe('1704153600'); // 秒
  });

  it('原始值为 10 位数字字符串时按秒级处理', () => {
    const ts = makeMatch({
      path: 'ts',
      originalValue: '1704067200'
    });
    const adjustedMs = 1704153600000;
    const result = getTimestampRowDisplay(ts, adjustedMs);
    expect(result.displayValue).toBe('1704153600');
  });

  it('指定 timezone 时 displayStandard 应按时区格式化', () => {
    const ts = makeMatch({
      path: 'ts',
      originalValue: 1704067200000
    });
    const resultUtc = getTimestampRowDisplay(ts, 1704067200000, 'UTC');
    const resultShanghai = getTimestampRowDisplay(ts, 1704067200000, 'Asia/Shanghai');
    expect(resultUtc.displayStandard).toBe('2024-01-01 00:00:00');
    expect(resultShanghai.displayStandard).toBe('2024-01-01 08:00:00');
  });
});
