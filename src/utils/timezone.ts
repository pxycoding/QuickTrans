import { Storage } from './storage';

export const TIMEZONE_STORAGE_KEY = 'user_timezone';

/**
 * 获取用户当前时区（浏览器/系统时区）
 */
export function getCurrentTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * 常用时区列表（IANA 时区标识）
 */
const COMMON_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'UTC',
];

/** 时区 IANA id -> 展示名称（zh / en），格式为 区域/城市 */
const TIMEZONE_DISPLAY_NAMES: Record<string, { zh: string; en: string }> = {
  'Asia/Shanghai': { zh: '亚洲/北京', en: 'Asia/Beijing' },
  'Asia/Hong_Kong': { zh: '亚洲/香港', en: 'Asia/Hong Kong' },
  'Asia/Tokyo': { zh: '亚洲/东京', en: 'Asia/Tokyo' },
  'Asia/Seoul': { zh: '亚洲/首尔', en: 'Asia/Seoul' },
  'Asia/Singapore': { zh: '亚洲/新加坡', en: 'Asia/Singapore' },
  'Asia/Bangkok': { zh: '亚洲/曼谷', en: 'Asia/Bangkok' },
  'Asia/Jakarta': { zh: '亚洲/雅加达', en: 'Asia/Jakarta' },
  'Asia/Kolkata': { zh: '亚洲/加尔各答', en: 'Asia/Kolkata' },
  'Asia/Dubai': { zh: '亚洲/迪拜', en: 'Asia/Dubai' },
  'Europe/London': { zh: '欧洲/伦敦', en: 'Europe/London' },
  'Europe/Paris': { zh: '欧洲/巴黎', en: 'Europe/Paris' },
  'Europe/Berlin': { zh: '欧洲/柏林', en: 'Europe/Berlin' },
  'Europe/Moscow': { zh: '欧洲/莫斯科', en: 'Europe/Moscow' },
  'America/New_York': { zh: '美洲/纽约', en: 'America/New York' },
  'America/Chicago': { zh: '美洲/芝加哥', en: 'America/Chicago' },
  'America/Denver': { zh: '美洲/丹佛', en: 'America/Denver' },
  'America/Los_Angeles': { zh: '美洲/洛杉矶', en: 'America/Los Angeles' },
  'America/Sao_Paulo': { zh: '美洲/圣保罗', en: 'America/Sao Paulo' },
  'Australia/Sydney': { zh: '大洋洲/悉尼', en: 'Australia/Sydney' },
  'Australia/Melbourne': { zh: '大洋洲/墨尔本', en: 'Australia/Melbourne' },
  'Pacific/Auckland': { zh: '太平洋/奥克兰', en: 'Pacific/Auckland' },
  UTC: { zh: '协调世界时', en: 'UTC' },
};

/**
 * 获取用于下拉框的时区列表：当前时区优先，再拼接常用时区（去重）
 * 中文环境下显示中文文案，英文环境下显示英文文案；未在列表中的时区使用 IANA id 作为展示
 */
export function getTimezoneOptions(locale: 'zh' | 'en' = 'zh'): { value: string; label: string }[] {
  const current = getCurrentTimezone();
  const set = new Set<string>([current, ...COMMON_TIMEZONES]);
  const ids = Array.from(set);
  return ids.map((value) => {
    const names = TIMEZONE_DISPLAY_NAMES[value];
    const label = names ? names[locale] : value;
    return { value, label };
  });
}

export async function getStoredTimezone(): Promise<string> {
  const saved = await Storage.get<string>(TIMEZONE_STORAGE_KEY);
  if (saved && typeof saved === 'string') {
    return saved;
  }
  return getCurrentTimezone();
}

export async function setStoredTimezone(timezone: string): Promise<void> {
  await Storage.set(TIMEZONE_STORAGE_KEY, timezone);
}
