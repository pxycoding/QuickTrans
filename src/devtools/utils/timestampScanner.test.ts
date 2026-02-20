import { describe, it, expect } from 'vitest';
import { TimestampScanner } from './timestampScanner';

describe('TimestampScanner', () => {
  describe('scanJson', () => {
    it('应扫描出 JSON 中的数字时间戳', () => {
      const obj = { createdAt: 1704067200000, name: 'test' };
      const matches = TimestampScanner.scanJson(obj);
      expect(matches).toHaveLength(1);
      expect(matches[0].path).toBe('createdAt');
      expect(matches[0].originalValue).toBe(1704067200000);
      expect(matches[0].converted.unix).toBe(1704067200);
    });

    it('应扫描嵌套对象中的时间戳', () => {
      const obj = { data: { items: [{ ts: 1704067200 }] } };
      const matches = TimestampScanner.scanJson(obj);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const tsMatch = matches.find(m => m.path.includes('ts'));
      expect(tsMatch).toBeDefined();
      expect(tsMatch!.converted.unix).toBe(1704067200);
    });

    it('应识别字符串格式的日期时间', () => {
      const obj = { date: '2024-01-01 00:00:00' };
      const matches = TimestampScanner.scanJson(obj);
      expect(matches).toHaveLength(1);
      expect(matches[0].path).toBe('date');
      expect(matches[0].converted.unix).toBe(1704067200);
    });

    it('null/undefined 应返回空数组', () => {
      expect(TimestampScanner.scanJson(null)).toEqual([]);
      expect(TimestampScanner.scanJson(undefined)).toEqual([]);
    });
  });

  describe('scanText', () => {
    it('应从文本中扫描 13 位时间戳', () => {
      const text = 'created at 1704067200000 end';
      const matches = TimestampScanner.scanText(text);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some(m => m.converted.unixMs === 1704067200000)).toBe(true);
    });

    it('应从文本中扫描 ISO 8601', () => {
      const text = 'time: 2024-01-01T00:00:00.000Z';
      const matches = TimestampScanner.scanText(text);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('时区选项', () => {
    it('传入 timezone 时扫描结果应按该时区显示标准时间', () => {
      // 1704067200000 = 2024-01-01 00:00:00 UTC = 2024-01-01 08:00:00 Asia/Shanghai
      const obj = { ts: 1704067200000 };
      const matchesUtc = TimestampScanner.scanJson(obj, '', { timezone: 'UTC' });
      const matchesShanghai = TimestampScanner.scanJson(obj, '', { timezone: 'Asia/Shanghai' });
      expect(matchesUtc).toHaveLength(1);
      expect(matchesShanghai).toHaveLength(1);
      expect(matchesUtc[0].converted.standard).toBe('2024-01-01 00:00:00');
      expect(matchesShanghai[0].converted.standard).toBe('2024-01-01 08:00:00');
    });

    it('scanText 传入 timezone 时转换结果应使用该时区', () => {
      const text = '1704067200000';
      const matches = TimestampScanner.scanText(text, { timezone: 'Asia/Tokyo' });
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const m = matches.find((x) => x.converted.unixMs === 1704067200000);
      expect(m).toBeDefined();
      expect(m!.converted.standard).toBe('2024-01-01 09:00:00'); // UTC+9
    });

    it('不传 timezone 时行为与之前一致（使用本地时区）', () => {
      const obj = { createdAt: 1704067200000 };
      const matches = TimestampScanner.scanJson(obj);
      expect(matches).toHaveLength(1);
      expect(matches[0].converted.unix).toBe(1704067200);
      expect(matches[0].converted.standard).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });
});
