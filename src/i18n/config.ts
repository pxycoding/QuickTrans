import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Storage } from '../utils/storage';
import { zh } from './locales/zh';
import { en } from './locales/en';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = 'i18n_locale';
let storageListenerRegistered = false;

/**
 * 获取当前语言
 */
async function getStoredLocale(): Promise<Locale> {
  const saved = await Storage.get<Locale>(STORAGE_KEY);
  if (saved && (saved === 'zh' || saved === 'en')) {
    return saved;
  }
  
  // 默认使用浏览器语言
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

let initPromise: Promise<void> | null = null;

/**
 * 初始化 i18next
 */
export async function initI18n(): Promise<void> {
  // 如果已经初始化或正在初始化，直接返回 Promise
  if (initPromise) {
    return initPromise;
  }
  
  // 如果已经初始化完成，直接返回
  if (i18n.isInitialized) {
    return Promise.resolve();
  }
  
  initPromise = (async () => {
    const locale = await getStoredLocale();
    
    // 只在未初始化时添加插件
    if (!i18n.isInitialized) {
      await i18n
        .use(initReactI18next)
        .init({
          resources: {
            zh: { translation: zh },
            en: { translation: en }
          },
          lng: locale,
          fallbackLng: 'zh',
          interpolation: {
            escapeValue: false // React 已经转义了
          },
          react: {
            useSuspense: false // Chrome Extension 环境不需要 Suspense
          }
        });
      
      // 监听语言变化并保存到 storage（只注册一次）
      i18n.on('languageChanged', async (lng) => {
        if (lng === 'zh' || lng === 'en') {
          await Storage.set(STORAGE_KEY, lng);
          // 触发自定义事件，用于跨环境同步
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: lng } }));
          }
          // 通知 background 脚本更新右键菜单
          try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.sendMessage({
                type: 'UPDATE_CONTEXT_MENU_LOCALE',
                payload: { locale: lng }
              }).catch(() => {
                // 忽略错误（可能 background 脚本未加载）
              });
            }
          } catch (error) {
            // 忽略错误
          }
        }
      });

      // 监听 storage 变化（跨 popup / content / background 同步语言）
      // 只注册一次，避免重复回调
      if (!storageListenerRegistered) {
        storageListenerRegistered = true;
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
              if (namespace !== 'local') return;
              const change = changes[STORAGE_KEY];
              const next = change?.newValue as unknown;
              if (next !== 'zh' && next !== 'en') return;

              // 如果当前语言已经是目标语言，跳过（避免循环）
              const current = i18n.language;
              if (current === next) return;

              i18n.changeLanguage(next).catch(() => {
                // 忽略错误
              });
            });
          }
        } catch {
          // 忽略错误
        }
      }
    }
  })();
  
  return initPromise;
}

/**
 * 设置语言
 */
export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
}

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
  const lng = i18n.language;
  if (lng === 'zh' || lng === 'en') {
    return lng;
  }
  return 'zh';
}

/**
 * 获取翻译函数（用于非 React 环境）
 */
export function t(key: string, params?: Record<string, string>): string {
  return i18n.t(key, params);
}

/**
 * 获取翻译对象（用于非 React 环境，如 background script）
 */
export function getTranslations(locale: Locale) {
  return locale === 'zh' ? zh : en;
}

// 导出 i18n 实例供非 React 环境使用
export default i18n;

