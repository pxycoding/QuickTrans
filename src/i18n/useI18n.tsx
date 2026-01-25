import { useTranslation } from 'react-i18next';
import { setLocale as changeLocale } from './config';
import type { Locale } from './config';

/**
 * React Hook for i18n
 * 基于 react-i18next 的 useTranslation Hook
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  
  const locale = (i18n.language === 'zh' || i18n.language === 'en') 
    ? i18n.language 
    : 'zh' as Locale;
  
  const handleSetLocale = async (newLocale: Locale) => {
    await changeLocale(newLocale);
  };
  
  // 提供 translations 对象供组件使用
  const translations = i18n.getResourceBundle(locale, 'translation') || {};
  
  return {
    locale,
    t: (key: string, params?: Record<string, string>) => t(key, params),
    setLocale: handleSetLocale,
    translations
  };
}

// 导出类型
export type { Locale };
