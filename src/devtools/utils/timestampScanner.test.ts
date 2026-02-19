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
});
