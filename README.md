# QA效率增强 Chrome 插件

一款专为QA工程师设计的Chrome浏览器插件，提供时间戳转换、二维码生成识别等功能，提升测试效率。

## 功能特性

### 📅 时间戳转换
- 自动识别10位/13位Unix时间戳
- 支持标准日期时间格式识别
- 多种格式输出：标准时间、ISO 8601、相对时间
- 支持时区转换

### 🔗 二维码生成
- 选中链接自动识别
- 一键生成二维码
- 支持尺寸调整（128/256/512px）
- 支持容错级别设置（L/M/Q/H）
- 支持下载二维码图片

### 🔍 二维码识别
- 右键点击二维码图片即可识别
- 自动识别内容类型（URL/邮箱/电话/文本）
- 快速复制或打开链接

## 使用方法

### 时间戳转换
1. 在网页中选中时间戳（如：`1704067200000`）
2. 点击出现的"📅 转换时间"按钮
3. 在悬浮窗中查看转换结果

### 二维码生成
1. 在网页中选中链接（如：`https://example.com`）
2. 点击出现的"🔗 生成二维码"按钮
3. 在悬浮窗中查看和下载二维码

### 二维码识别
1. 右键点击页面上的二维码图片
2. 选择"🔍 识别二维码"
3. 在悬浮窗中查看识别结果

## 开发

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建
```bash
npm run build
```

构建完成后，在Chrome中加载 `dist` 目录作为未打包的扩展程序。

### 自动化测试

项目使用 [Vitest](https://vitest.dev/) 做单元测试，与 Vite 同源配置。

```bash
# 安装依赖（若尚未安装）
npm install

# 监听模式运行测试（修改代码时自动重跑）
npm run test

# 单次运行全部测试
npm run test:run

# 生成覆盖率报告
npm run test:coverage
```

测试文件约定：`src/**/*.test.ts`、`src/**/*.test.tsx`。当前覆盖转换器（时间戳、内容检测）、DevTools 工具（时间戳扫描、URL 提取）等纯逻辑；依赖 Chrome API 或 DOM 的模块可在测试中 mock 后逐步补充。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **Chrome API**: Manifest V3
- **核心库**:
  - dayjs: 时间处理
  - qrcode: 二维码生成
  - jsQR: 二维码识别

## 项目结构

```
qa-booster-extension/
├── src/
│   ├── background/      # Service Worker
│   ├── content/         # Content Script
│   ├── popup/           # 弹出页面
│   ├── converters/      # 转换器模块
│   ├── components/      # React组件
│   ├── utils/           # 工具函数
│   └── types/           # TypeScript类型
├── public/              # 静态资源
└── dist/               # 构建输出
```

## 许可证

MIT

