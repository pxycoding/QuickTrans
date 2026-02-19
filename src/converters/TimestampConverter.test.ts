import { describe, it, expect } from 'vitest';
import { TimestampConverter } from './TimestampConverter';

describe('TimestampConverter', () => {
  describe('fromTimestamp', () => {
    it('应正确转换 10 位秒级时间戳', () => {
      const result = TimestampConverter.fromTimestamp(1704067200, { includeRelative: false });
      expect(result.original).toBe(1704067200);
      expect(result.unix).toBe(1704067200);
      expect(result.unixMs).toBe(1704067200000);
      expect(result.standard).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(result.iso8601).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('应正确转换 13 位毫秒级时间戳', () => {
      const result = TimestampConverter.fromTimestamp(1704067200000, { includeRelative: false });
      expect(result.unix).toBe(1704067200);
      expect(result.unixMs).toBe(1704067200000);
    });

    it('NaN 应抛出错误', () => {
      expect(() => TimestampConverter.fromTimestamp(Number.NaN)).toThrow('Invalid timestamp: NaN');
    });

    it('includeRelative 为 true 时应包含 relative 字段', () => {
      const result = TimestampConverter.fromTimestamp(1704067200);
      expect(result.relative).toBeDefined();
      expect(typeof result.relative).toBe('string');
    });
  });

  describe('toTimestamp', () => {
    it('应正确将标准日期时间字符串转为时间戳', () => {
      const result = TimestampConverter.toTimestamp('2024-01-01 00:00:00', {
        includeRelative: false,
        timezone: 'Asia/Shanghai',
      });
      expect(result.unix).toBe(1704038400);
      expect(result.unixMs).toBe(1704038400000);
      expect(result.standard).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('无效日期字符串应抛出错误', () => {
      expect(() => TimestampConverter.toTimestamp('not-a-date')).toThrow();
    });
  });

  describe('convertTimezone', () => {
    it('应能按时区转换数字时间戳', () => {
      const result = TimestampConverter.convertTimezone(
        1704067200000,
        'UTC',
        'Asia/Shanghai'
      );
      expect(result.unixMs).toBeDefined();
      expect(result.timezone).toBe('Asia/Shanghai');
    });
  });
});
