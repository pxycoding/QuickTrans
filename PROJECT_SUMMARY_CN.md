# QuickTrans 项目精华梳理

> 用于面试时讲清：右键菜单如何触发、DevTools 网络面板如何接入、内容检测如何贯穿全流程。

---

## 一、项目一句话

QuickTrans 是一个「内容感知」的浏览器扩展：自动识别时间戳、日期、URL/路径，通过右键菜单和页面悬浮窗做一键转换/二维码，并在 DevTools 里监听网络请求，自动扫描接口中的时间戳与 URL，方便 QA/开发调试。

---

## 二、右键菜单如何触发与联动

### 2.1 权限与注册

- **manifest.json**：声明 `"permissions": ["storage", "activeTab", "contextMenus"]`，未申请 `tabs` 权限。
- **background**：`"background": { "service_worker": "background/index.js", "type": "module" }`。

在 `chrome.runtime.onInstalled` 里创建两个一级菜单（避免被 Chrome 收进子菜单）：
- `decode-qrcode`：`contexts: ['image']`，右键图片时出现。
- `quicktrans-selection`：`contexts: ['selection']`，右键选中文字时出现，**标题根据内容类型动态变化**（「转换时间戳」或「生成二维码」）。

### 2.2 选中文本 → 内容检测 → 动态更新菜单标题

- **内容脚本**入口初始化 `SelectionMonitor`，监听 `document` 的 `selectionchange`（带 300ms debounce）。
- 每次选区变化：取 `window.getSelection().toString()`，调用 `ContentDetector.detect(text)`，得到 `isTimestamp`、`isURL`。
- 通过 `chrome.runtime.sendMessage({ type: 'UPDATE_CONTEXT_MENU', payload: { isTimestamp, isURL } })` 发给 background。
- **background** 用 `contextMenuStateByTab.set(tabId, { isTimestamp, isURL })` 存状态，若当前 tab 是活动 tab，则调用 `chrome.contextMenus.update('quicktrans-selection', { title })` 更新标题。

### 2.3 点击菜单后的行为

- **background** 监听 `chrome.contextMenus.onClicked`：
  - 若为 `decode-qrcode`：在 background 里用 `fetch` 把图片拉成 data URL（避免 content 跨域），再 `chrome.tabs.sendMessage(tabId, { type: 'DECODE_QRCODE', payload: { imageUrl } })`。
  - 若为 `quicktrans-selection`：根据 `contextMenuStateByTab.get(tabId)` 决定发 `GENERATE_QRCODE` 或 `CONVERT_TIMESTAMP`，并把 `info.selectionText` 一并传给 content。
- **content** 的 `chrome.runtime.onMessage` 收到后，调用 `FloatWindowManager` 打开对应悬浮面板（时间戳转换 / 二维码生成或识别）。

**面试可概括**：右键菜单在 background 注册，但「显示什么标题、点完走时间戳还是二维码」由 content 做内容检测后通过消息同步给 background，再由 background 转发给当前 tab 的 content 执行。

---

## 三、DevTools 网络面板如何挂到开发者工具

### 3.1 入口声明

- **manifest.json**：`"devtools_page": "devtools/devtools.html"`。打开某页的 DevTools 时，Chrome 会加载该页面作为扩展在 DevTools 侧的入口。

### 3.2 创建自定义面板

- **devtools/devtools.ts**：`chrome.devtools.panels.create('QuickTrans', 'icons/...', 'panel/panel.html', callback)`。  
- 在 DevTools 顶部会出现一个名为「QuickTrans」的 Tab，与 Network、Console 等并列；`panel.html` 里挂载 React 应用，主界面是 **NetworkPanel**。

### 3.3 监听网络请求

- **NetworkPanel.tsx**：在 `useEffect` 里注册 `chrome.devtools.network.onRequestFinished.addListener(handler)`。
- 只处理 `type === 'fetch' || type === 'xhr'`，避免静态资源刷屏。
- 每条请求调用 `requestCache.addRequest(request)` 写入缓存，再 `updateRequests()` 刷新列表。

### 3.4 请求缓存与按需加载

- **requestCache.ts**：维护 `RequestMetadata` 列表（requestId、url、method、status、timestamp 等），首次只存元数据，不拉 body。
- 用户点击某条请求进入详情时，再通过 `loadContentFromRequest(requestId)` 调用 `request.getContent()` 拉取 response/request body 和 headers。
- 有 `maxSize`（如 200 条）、`maxBodyCache`（如 20 条 body）限制，防止内存膨胀。

### 3.5 内容检测在网络面板中的使用

- **NetworkPanel** 使用 `requestCache`、**TimestampScanner**、**UrlExtractor**。
- 在请求详情（RequestDetail）中：拿到 responseBody/requestBody 后，用 TimestampScanner 扫描所有时间戳（10 位、13 位、ISO、嵌套 JSON 等），用 UrlExtractor 从 JSON/文本中提取 URL 和相对路径并标注 JSON 路径，在 UI 上高亮展示，并可跳转到时间戳转换/二维码能力。

**面试可概括**：网络面板是挂在 DevTools 里的 React 应用，用 `chrome.devtools.network` 只监听 fetch/xhr，自建轻量缓存；用户点进某条请求时才按需拉 body，再用时间戳扫描器和 URL 提取器做内容检测与展示。

---

## 四、内容检测（ContentDetector）设计

### 4.1 职责

自动识别一段文本的类型，用于：右键菜单标题、点击后的行为分支、以及（在扩展其他处）对接口 body 的解析。

### 4.2 检测顺序与规则

1. **秒级时间戳**：`/^\d{10}$/`，且数值在合理范围（如 2000-01-01 ～ 2100-01-01 对应秒数）。
2. **毫秒级时间戳**：`/^\d{13}$/`，同样做范围校验。
3. **日期时间字符串**：如 `YYYY-MM-DD HH:mm:ss`、`YYYY/MM/DD HH:mm:ss`、ISO8601 等正则。
4. **完整 URL**：`http(s)://...` 正则 + `new URL(text)` 校验。
5. **相对路径**：如 `/page/list?env=test`、`page/list` 等，与 UrlExtractor 的规则一致。
6. 以上都不匹配则返回 **UNKNOWN**。

### 4.3 使用场景

- **SelectionMonitor**：根据检测结果更新右键菜单状态（`UPDATE_CONTEXT_MENU`）。
- **content 处理 CONVERT_TIMESTAMP / GENERATE_QRCODE**：再次检测以校验选中内容，不识别则提示错误或打开空面板让用户输入。
- **DevTools 侧**：TimestampScanner、UrlExtractor 对接口 body 的解析与 ContentDetector 的规则保持一致（时间范围、URL/路径格式），保证「选中文字」与「接口里的字段」行为统一。

---

## 五、面试可用的 Q&A

**Q：为什么内容检测在 content 做，而不是在 background 里根据 selectionText 判断？**  
A：后台拿不到页面选区上下文；内容脚本离页面近，后续若要加「选中后悬浮按钮」等 UI 也方便。职责上：content 负责「检测 + 展示」，background 负责「菜单注册 + 消息路由」，且全项目共用一套 ContentDetector，避免前后端规则不一致。

**Q：DevTools 里只监听 fetch/xhr，会不会漏掉请求？**  
A：产品目标主要是接口调试和时间戳/URL 分析，所以优先抓 API 请求；静态资源对这类分析价值小且会干扰列表。若有需求，可以后续把类型过滤做成可配置。

**Q：网络面板里接口 body 很大时会不会占很多内存？**  
A：做了两点控制：① 请求列表有上限（如 200），超出删最老的；② 真正加载了 body 的请求另有较小上限（如 20），超出只清 body 缓存，保留元数据，列表仍可浏览。

---

## 六、相关文件速查

| 功能           | 文件 |
|----------------|------|
| 右键菜单创建与点击 | `src/background/index.ts` |
| 选中监听与菜单状态上报 | `src/content/SelectionMonitor.ts` |
| 内容脚本入口与消息处理 | `src/content/index.tsx` |
| 内容类型检测     | `src/converters/ContentDetector.ts` |
| DevTools 入口与面板创建 | `src/devtools/devtools.ts` |
| 网络面板 UI 与请求监听 | `src/devtools/panel/NetworkPanel.tsx` |
| 请求缓存与按需拉 body | `src/devtools/utils/requestCache.ts` |
| URL/路径提取（含相对路径） | `src/devtools/utils/urlExtractor.ts` |
