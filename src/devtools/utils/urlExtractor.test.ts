import { describe, it, expect } from 'vitest';
import { UrlExtractor } from './urlExtractor';

describe('UrlExtractor', () => {
  describe('extractFromText', () => {
    it('应从文本中提取 URL', () => {
      const text = 'visit https://example.com and http://test.org/path';
      const urls = UrlExtractor.extractFromText(text);
      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls.some(u => u.url === 'https://example.com')).toBe(true);
      expect(urls.some(u => u.url === 'http://test.org/path')).toBe(true);
    });

    it('应去重相同 URL', () => {
      const text = 'https://example.com https://example.com';
      const urls = UrlExtractor.extractFromText(text);
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe('https://example.com');
    });

    it('应使用传入的 source', () => {
      const urls = UrlExtractor.extractFromText('https://example.com', 'response');
      expect(urls).toHaveLength(1);
      expect(urls[0].source).toBe('response');
    });

    it('无 URL 时返回空数组', () => {
      expect(UrlExtractor.extractFromText('no url here')).toEqual([]);
    });
  });

  describe('extractFromJson', () => {
    it('应从 JSON 对象中提取 URL 字符串', () => {
      const obj = { link: 'https://example.com', nested: { url: 'http://foo.com' } };
      const urls = UrlExtractor.extractFromJson(obj);
      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls.some(u => u.url === 'https://example.com' && u.path === 'link')).toBe(true);
    });

    it('null/undefined 应返回空数组', () => {
      expect(UrlExtractor.extractFromJson(null)).toEqual([]);
      expect(UrlExtractor.extractFromJson(undefined)).toEqual([]);
    });
  });

  describe('extractFromRequest', () => {
    it('应包含请求 URL 并从 body 提取', () => {
      const urls = UrlExtractor.extractFromRequest(
        'https://api.example.com',
        undefined,
        JSON.stringify({ redirectUrl: 'https://redirect.com' })
      );
      expect(urls.some(u => u.url === 'https://api.example.com')).toBe(true);
      expect(urls.some(u => u.url === 'https://redirect.com')).toBe(true);
    });
  });
});
