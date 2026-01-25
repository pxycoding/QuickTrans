# 国际化系统实现文档

## 📋 当前实现

本项目使用 `react-i18next` + `i18next` 作为国际化解决方案。

### 1. 文件结构

```
src/i18n/
├── config.ts              # i18next 配置和工具函数
├── useI18n.tsx            # React Hook（基于 react-i18next）
└── locales/
    ├── zh.ts             # 中文翻译资源
    └── en.ts             # 英文翻译资源
```

### 2. 核心 API

#### 2.1 非 React 环境（Content Script / Background）

**文件：`src/i18n/config.ts`**

```typescript
// 初始化 i18next（需要在脚本入口调用）
export async function initI18n(): Promise<void>

// 获取当前语言
export function getLocale(): Locale

// 设置语言
export async function setLocale(locale: Locale): Promise<void>

// 获取翻译函数
export function t(key: string, params?: Record<string, string>): string

// 获取翻译对象（用于 background script 等场景）
export function getTranslations(locale: Locale): Translations
```

**使用示例：**
```typescript
import { initI18n, t } from '../i18n/config';

// 初始化（在脚本入口）
initI18n();

// 使用翻译函数
const errorMsg = t('errors.unrecognizedTimestamp');
```

#### 2.2 React 环境

**文件：`src/i18n/useI18n.tsx`**

```typescript
// Hook
export function useI18n(): {
  locale: Locale;
  t: (key: string, params?: Record<string, string>) => string;
  setLocale: (locale: Locale) => Promise<void>;
  translations: Translations;
}
```

**使用示例：**
```typescript
import { useI18n } from '../i18n/useI18n';

const { t, locale, setLocale } = useI18n();
<h1>{t('app.title')}</h1>
```

### 3. 翻译资源结构

**类型定义：**
```typescript
type Locale = 'zh' | 'en';
type Translations = {
  common: { copy: string; copyAll: string; ... };
  app: { title: string; subtitle: string; ... };
  timestamp: { title: string; originalValue: string; ... };
  qrcode: { title: string; decodeTitle: string; ... };
  features: { ... };
  settings: { ... };
  contextMenu: { ... };
  errors: { ... };
  language: { zh: string; en: string; };
}
```

**嵌套路径示例：**
- `'common.copy'` → `zh.common.copy`
- `'timestamp.standardTime'` → `zh.timestamp.standardTime`
- `'errors.unrecognizedTimestamp'` → `zh.errors.unrecognizedTimestamp`

**参数化翻译：**
```typescript
t('timestamp.copyAllText', {
  standard: result.standard,
  iso8601: result.iso8601,
  unix: result.unix.toString(),
  unixMs: result.unixMs.toString()
})
// 翻译文本: "标准时间: {standard}\nISO 8601: {iso8601}..."
```

### 4. 使用位置清单

#### 4.1 React 组件（使用 `useI18n` Hook）

| 文件 | 使用方式 | 行数 |
|------|---------|------|
| `src/popup/App.tsx` | `t('app.title')`, `t('app.subtitle')`, `t('app.features')`, `t('app.settings')` | 4处 |
| `src/popup/pages/Home.tsx` | `t('features.*')`, `translations.features.usageTips.tips` | ~10处 |
| `src/popup/pages/Settings.tsx` | `t('settings.*')`, `t('common.*')`, `t('language.*')`, `setLocale()` | ~15处 |
| `src/components/TimestampPanel.tsx` | `t('timestamp.*')`, `t('common.*')` | ~20处 |
| `src/components/QRCodeDecoderPanel.tsx` | `t('qrcode.*')`, `t('common.*')`, `t('settings.*')` | ~30处 |
| `src/components/FloatWindow.tsx` | `t('common.*')`, `t('qrcode.inputWindowName')` | ~5处 |

#### 4.2 非 React 环境

| 文件 | 使用方式 | 说明 |
|------|---------|------|
| `src/content/index.tsx` | `initI18n()`, `t('errors.*')` | Content Script 入口初始化 |
| `src/background/index.ts` | `initI18n()`, `getLocale()`, `getTranslations(locale)` | Background Script 入口初始化 |
| `src/content/FloatWindowManager.tsx` | `initI18n()` | 在渲染组件前初始化 |

#### 4.3 初始化位置

| 文件 | 说明 |
|------|------|
| `src/popup/index.tsx` | Popup 入口，在渲染前初始化 i18next |
| `src/content/index.tsx` | Content Script 入口，初始化 i18next |
| `src/background/index.ts` | Background Script 入口，初始化 i18next |
| `src/content/FloatWindowManager.tsx` | 在渲染悬浮窗组件前初始化 i18next |

### 5. 特殊功能点

#### 5.1 语言切换机制

- 使用 `i18next` 的 `changeLanguage` API
- 语言变化时自动保存到 Chrome Storage
- 触发自定义事件 `locale-changed` 用于跨环境同步
- 通知 background 脚本更新右键菜单

#### 5.2 跨环境同步

- **Popup ↔ Content Script**: 通过 Chrome Storage 同步
- **Popup ↔ Background**: 通过 `chrome.runtime.sendMessage` 通知更新右键菜单
- **Content Script 内部**: 通过自定义事件同步

#### 5.3 存储机制

```typescript
// 使用 Chrome Storage 持久化语言设置
const STORAGE_KEY = 'i18n_locale';
Storage.set(STORAGE_KEY, locale);
Storage.get<Locale>(STORAGE_KEY);
```

#### 5.4 默认语言检测

```typescript
// 自动检测浏览器语言
const browserLang = navigator.language.toLowerCase();
if (browserLang.startsWith('zh')) {
  return 'zh';
}
return 'en';
```

#### 5.5 防重复初始化

`initI18n()` 函数实现了防重复初始化逻辑，确保 i18next 只初始化一次，即使多次调用也是安全的。

### 6. 翻译键统计

**主要模块：**
- `common.*` - 通用文本（31个键）
- `app.*` - 应用标题和导航（4个键）
- `timestamp.*` - 时间戳转换（12个键）
- `qrcode.*` - 二维码相关（20+个键）
- `features.*` - 功能说明（10+个键）
- `settings.*` - 设置页面（8个键）
- `contextMenu.*` - 右键菜单（3个键）
- `errors.*` - 错误消息（11个键）
- `language.*` - 语言选择器（2个键）

**总计：** 约 100+ 个翻译键

### 7. 技术栈

- **i18next**: 核心国际化框架
- **react-i18next**: React 集成
- **Chrome Storage**: 语言设置持久化
- **TypeScript**: 类型安全支持

### 8. 注意事项

1. **Chrome Extension 特殊环境**
   - Content Script、Background Script 和 Popup 需要分别初始化 i18next
   - 使用防重复初始化机制确保安全

2. **存储同步**
   - 语言设置通过 Chrome Storage 在 Popup、Content Script、Background 之间同步

3. **右键菜单更新**
   - Background Script 监听语言变化并更新右键菜单文本

4. **类型安全**
   - 使用 TypeScript 类型定义保持类型安全
   - `Locale` 类型限制为 `'zh' | 'en'`

---

**最后更新：** 2024年
**当前实现版本：** react-i18next
