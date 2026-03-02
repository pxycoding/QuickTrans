import { describe, it, expect } from 'vitest';
import { applyTimestampAdjustments } from './timestampAdjust';

// 2024-01-01 00:00:00 UTC = 1704067200000
const BASE_MS = 1704067200000;

describe('applyTimestampAdjustments', () => {
  it('零调整应返回原时间戳', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0
    });
    expect(result).toBe(BASE_MS);
  });

  it('加 1 天应得到次日 00:00:00', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0
    });
    // 2024-01-02 00:00:00 UTC = 1704153600000
    expect(result).toBe(1704153600000);
  });

  it('加 1 小时应正确增加 3600000 毫秒', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 0,
      hour: 1,
      minute: 0,
      second: 0
    });
    expect(result).toBe(BASE_MS + 3600000);
  });

  it('加 1 分钟应正确增加 60000 毫秒', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 1,
      second: 0
    });
    expect(result).toBe(BASE_MS + 60000);
  });

  it('加 1 秒应正确增加 1000 毫秒', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 1
    });
    expect(result).toBe(BASE_MS + 1000);
  });

  it('减 1 天应得到前一日', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: -1,
      hour: 0,
      minute: 0,
      second: 0
    });
    // 2023-12-31 00:00:00 UTC = 1703980800000
    expect(result).toBe(1703980800000);
  });

  it('减 1 个月应得到 2023-12-01 00:00:00', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: -1,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0
    });
    // 2023-12-01 00:00:00 UTC
    expect(result).toBe(1701388800000);
  });

  it('加 1 年应得到 2025-01-01 00:00:00 UTC', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 1,
      month: 0,
      day: 0,
      hour: 0,
      minute: 0,
      second: 0
    });
    expect(result).toBe(1735689600000);
  });

  it('组合调整：加 2 天 3 小时 30 分 45 秒', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 2,
      hour: 3,
      minute: 30,
      second: 45
    });
    const expected =
      BASE_MS +
      2 * 24 * 3600 * 1000 +
      3 * 3600 * 1000 +
      30 * 60 * 1000 +
      45 * 1000;
    expect(result).toBe(expected);
  });

  it('负数组合：减 1 小时 30 分', () => {
    const result = applyTimestampAdjustments(BASE_MS, {
      year: 0,
      month: 0,
      day: 0,
      hour: -1,
      minute: -30,
      second: 0
    });
    expect(result).toBe(BASE_MS - 3600000 - 30 * 60000);
  });
});
