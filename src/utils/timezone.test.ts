import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TIMEZONE_STORAGE_KEY,
  getCurrentTimezone,
  getTimezoneOptions,
  getStoredTimezone,
  setStoredTimezone,
} from './timezone';
import { Storage } from './storage';

vi.mock('./storage', () => ({
  Storage: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('timezone', () => {
  beforeEach(() => {
    vi.mocked(Storage.get).mockResolvedValue(null);
    vi.mocked(Storage.set).mockResolvedValue(undefined);
  });

  describe('getCurrentTimezone', () => {
    it('应返回字符串形式的 IANA 时区', () => {
      const tz = getCurrentTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
      // 常见格式：Region/City 或 UTC
      expect(tz === 'UTC' || tz.includes('/')).toBe(true);
    });
  });

  describe('getTimezoneOptions', () => {
    it('中文环境下应返回带中文展示名的选项', () => {
      const options = getTimezoneOptions('zh');
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      options.forEach((opt) => {
        expect(opt).toHaveProperty('value');
        expect(opt).toHaveProperty('label');
      });
      const beijing = options.find((o) => o.value === 'Asia/Shanghai');
      expect(beijing).toBeDefined();
      expect(beijing!.label).toBe('亚洲/北京');
      const hk = options.find((o) => o.value === 'Asia/Hong_Kong');
      expect(hk).toBeDefined();
      expect(hk!.label).toBe('亚洲/香港');
    });

    it('英文环境下应返回带英文展示名的选项', () => {
      const options = getTimezoneOptions('en');
      const beijing = options.find((o) => o.value === 'Asia/Shanghai');
      expect(beijing).toBeDefined();
      expect(beijing!.label).toBe('Asia/Beijing');
      const hk = options.find((o) => o.value === 'Asia/Hong_Kong');
      expect(hk).toBeDefined();
      expect(hk!.label).toBe('Asia/Hong Kong');
    });

    it('当前时区应排在列表首位且去重', () => {
      const options = getTimezoneOptions('zh');
      const values = options.map((o) => o.value);
      const unique = [...new Set(values)];
      expect(values).toEqual(unique);
      expect(options[0].value).toBe(getCurrentTimezone());
    });

    it('UTC 在中文下展示为协调世界时', () => {
      const options = getTimezoneOptions('zh');
      const utc = options.find((o) => o.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc!.label).toBe('协调世界时');
    });
  });

  describe('getStoredTimezone / setStoredTimezone', () => {
    it('无存储时应返回当前时区', async () => {
      vi.mocked(Storage.get).mockResolvedValue(null);
      const tz = await getStoredTimezone();
      expect(tz).toBe(getCurrentTimezone());
    });

    it('有存储时应返回存储的时区', async () => {
      vi.mocked(Storage.get).mockResolvedValue('Asia/Tokyo');
      const tz = await getStoredTimezone();
      expect(tz).toBe('Asia/Tokyo');
    });

    it('setStoredTimezone 应使用正确 key 写入', async () => {
      await setStoredTimezone('Europe/London');
      expect(Storage.set).toHaveBeenCalledWith(TIMEZONE_STORAGE_KEY, 'Europe/London');
    });

    it('写入后 getStoredTimezone 应读到写入值', async () => {
      vi.mocked(Storage.get).mockResolvedValue('America/New_York');
      const tz = await getStoredTimezone();
      expect(tz).toBe('America/New_York');
    });
  });
});
