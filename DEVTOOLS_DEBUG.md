# DevTools Panel 调试指南

如果 DevTools 面板没有显示，请按照以下步骤排查：

## 1. 确认文件已正确构建

检查以下文件是否存在：
- `dist/devtools/devtools.html`
- `dist/devtools/devtools.js`
- `dist/panel/panel.html`
- `dist/panel/panel.js`
- `dist/manifest.json` 中包含 `"devtools_page": "devtools/devtools.html"`

## 2. 重新加载扩展

1. 打开 `chrome://extensions/`
2. 找到 QuickTrans 扩展
3. 点击"重新加载"按钮（或关闭后重新加载）

## 3. 关闭并重新打开 DevTools

**重要**：DevTools 面板只在 DevTools 窗口打开时创建，所以需要：
1. 完全关闭所有 DevTools 窗口
2. 重新打开 DevTools（F12 或右键 -> 检查）

## 4. 检查控制台错误

### 检查 DevTools Page 的错误
1. 打开 `chrome://extensions/`
2. 找到 QuickTrans 扩展
3. 点击"检查视图 service worker"（如果有）
4. 或者打开 DevTools，在 Console 中查看是否有错误

### 检查 Panel 的错误
1. 打开 DevTools
2. 如果面板已创建，右键点击面板标签
3. 选择"检查"（Inspect）
4. 查看控制台是否有错误

## 5. 手动检查面板是否创建

在 DevTools Console 中运行：
```javascript
chrome.devtools.panels.elements // 应该能看到 Elements 面板对象
```

## 6. 常见问题

### 问题 1: 面板创建失败
- **原因**：图标路径错误或文件不存在
- **解决**：检查 `dist/icons/quickTrans_48x48.png` 是否存在

### 问题 2: Panel HTML 加载失败
- **原因**：panel.html 路径错误
- **解决**：检查 `dist/panel/panel.html` 是否存在，路径应该是相对于扩展根目录的 `panel/panel.html`

### 问题 3: Panel JS 加载失败
- **原因**：panel.js 路径错误或模块加载失败
- **解决**：检查 `dist/panel/panel.js` 是否存在，检查浏览器控制台是否有模块加载错误

### 问题 4: React 初始化失败
- **原因**：i18n 初始化失败或其他依赖问题
- **解决**：检查 Panel 的控制台（右键面板标签 -> 检查），查看具体错误信息

## 7. 验证步骤

1. ✅ 构建成功：`pnpm run build` 无错误
2. ✅ 文件存在：检查 `dist/devtools/` 和 `dist/panel/` 目录
3. ✅ 扩展已重新加载
4. ✅ DevTools 已关闭并重新打开
5. ✅ 检查控制台无错误

如果以上步骤都完成但仍未显示，请检查：
- Chrome 版本是否支持 DevTools 扩展（需要 Chrome 88+）
- 是否有其他扩展冲突
- 尝试在无痕模式下测试

