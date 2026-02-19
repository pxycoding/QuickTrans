import { describe, it, expect } from 'vitest';
import { ContentDetector } from './ContentDetector';
import { ContentType } from '../types';

describe('ContentDetector', () => {
  describe('时间戳检测', () => {
    it('应识别 10 位秒级时间戳', () => {
      const r = ContentDetector.detect('1704067200');
      expect(r.type).toBe(ContentType.TIMESTAMP_SECOND);
      expect(r.value).toBe('1704067200');
      expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('应识别 13 位毫秒级时间戳', () => {
      const r = ContentDetector.detect('1704067200000');
      expect(r.type).toBe(ContentType.TIMESTAMP_MILLISECOND);
      expect(r.value).toBe('1704067200000');
    });

    it('超出范围的时间戳应识别为 UNKNOWN', () => {
      const r = ContentDetector.detect('1');
      expect(r.type).toBe(ContentType.UNKNOWN);
    });

    it('首尾空格应被 trim', () => {
      const r = ContentDetector.detect('  1704067200  ');
      expect(r.type).toBe(ContentType.TIMESTAMP_SECOND);
      expect(r.value).toBe('1704067200');
    });
  });

  describe('日期时间检测', () => {
    it('应识别 YYYY-MM-DD HH:mm:ss', () => {
      const r = ContentDetector.detect('2024-01-01 12:00:00');
      expect(r.type).toBe(ContentType.DATETIME);
      expect(r.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('应识别 YYYY/MM/DD HH:mm:ss', () => {
      const r = ContentDetector.detect('2024/01/01 12:00:00');
      expect(r.type).toBe(ContentType.DATETIME);
    });

    it('应识别 ISO 8601 格式', () => {
      const r = ContentDetector.detect('2024-01-01T12:00:00Z');
      expect(r.type).toBe(ContentType.DATETIME);
    });
  });

  describe('URL 检测', () => {
    it('应识别 http URL', () => {
      const r = ContentDetector.detect('http://example.com/path');
      expect(r.type).toBe(ContentType.URL);
      expect(r.value).toBe('http://example.com/path');
      expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('应识别 https URL', () => {
      const r = ContentDetector.detect('https://www.example.com?a=1');
      expect(r.type).toBe(ContentType.URL);
    });

    it('纯文本应识别为 UNKNOWN', () => {
      const r = ContentDetector.detect('hello world');
      expect(r.type).toBe(ContentType.UNKNOWN);
      expect(r.confidence).toBe(0);
    });
  });

  describe('detectMultiple', () => {
    it('应批量检测多个文本', () => {
      const results = ContentDetector.detectMultiple(['1704067200', 'https://example.com', 'abc']);
      expect(results).toHaveLength(3);
      expect(results[0].type).toBe(ContentType.TIMESTAMP_SECOND);
      expect(results[1].type).toBe(ContentType.URL);
      expect(results[2].type).toBe(ContentType.UNKNOWN);
    });
  });
});
