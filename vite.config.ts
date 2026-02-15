// 导入 Vite 的配置定义函数，用于创建 Vite 配置文件
import { defineConfig } from 'vite';
// 导入 React 插件，用于解析和编译 TSX/JSX 文件
import react from '@vitejs/plugin-react'; // 解析TSX/JSX
// 导入 Node.js 文件系统模块，用于文件操作
import fs from 'fs';
// 导入 Node.js 路径处理模块，用于路径解析和操作
import path from 'path';

// 自定义插件：移动 popup HTML 文件到正确位置
// Custom plugin to move popup HTML
const movePopupHtml = () => {
  // 返回 Vite 插件对象
  return {
    // 插件名称，用于调试和日志
    name: 'move-popup-html',
    // 在构建完成后执行的钩子函数
    closeBundle() {
      // 构建后 popup HTML 文件的源路径（在 dist/src/popup/ 目录下）
      const srcPath = path.resolve(__dirname, 'dist/src/popup/index.html');
      // popup HTML 文件的目标路径（在 dist/popup/ 目录下）
      const destPath = path.resolve(__dirname, 'dist/popup/index.html');
      
      // 检查源文件是否存在
      if (fs.existsSync(srcPath)) {
        // 确保目标目录存在（虽然应该已经存在，但为了安全起见）
        // Ensure dest dir exists (it should, but safety first)
        // 获取目标文件的目录路径
        const destDir = path.dirname(destPath);
        // 如果目标目录不存在，则创建它（递归创建所有父目录）
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        // 将源文件移动到目标位置（重命名操作）
        fs.renameSync(srcPath, destPath);
        // 输出成功日志信息
        console.log('[move-popup-html] Moved index.html to dist/popup/');
        
        // 清理空的 src 目录
        // Clean up empty src dir
        try {
          // 获取源目录路径
          const srcDir = path.resolve(__dirname, 'dist/src');
          // 如果源目录存在，则删除它（递归删除，强制删除）
          if (fs.existsSync(srcDir)) {
             fs.rmSync(srcDir, { recursive: true, force: true });
          }
        } catch (e) {
          // 忽略删除过程中的任何错误
          // ignore
        }
      }
    }
  };
};

// 自定义插件：复制 devtools HTML 文件到构建输出目录
// Custom plugin to copy devtools HTML files
const copyDevtoolsHtml = () => {
  // 返回 Vite 插件对象
  return {
    // 插件名称，用于调试和日志
    name: 'copy-devtools-html',
    // 在构建完成后执行的钩子函数
    closeBundle() {
      // 复制 devtools.html 从 src 到 dist
      // Copy devtools.html from src to dist
      // devtools.html 的源文件路径
      const devtoolsSrc = path.resolve(__dirname, 'src/devtools/devtools.html');
      // devtools.html 的目标文件路径
      const devtoolsDest = path.resolve(__dirname, 'dist/devtools/devtools.html');
      
      // 检查源文件是否存在
      if (fs.existsSync(devtoolsSrc)) {
        // 获取目标文件的目录路径
        const destDir = path.dirname(devtoolsDest);
        // 如果目标目录不存在，则创建它（递归创建所有父目录）
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        // 复制源文件到目标位置
        fs.copyFileSync(devtoolsSrc, devtoolsDest);
        // 输出成功日志信息
        console.log('[copy-devtools-html] Copied devtools.html to dist/devtools/');
      } else {
        // 如果源文件不存在，输出警告信息
        console.warn('[copy-devtools-html] Source file not found:', devtoolsSrc);
      }

      // 复制 panel.html 从 src 到 dist
      // Copy panel.html from src to dist
      // panel.html 的源文件路径
      const panelSrc = path.resolve(__dirname, 'src/devtools/panel/panel.html');
      // panel.html 的目标文件路径
      const panelDest = path.resolve(__dirname, 'dist/panel/panel.html');
      
      // 检查源文件是否存在
      if (fs.existsSync(panelSrc)) {
        // 获取目标文件的目录路径
        const destDir = path.dirname(panelDest);
        // 如果目标目录不存在，则创建它（递归创建所有父目录）
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        // 复制源文件到目标位置
        fs.copyFileSync(panelSrc, panelDest);
        // 输出成功日志信息
        console.log('[copy-devtools-html] Copied panel.html to dist/panel/');
      } else {
        // 如果源文件不存在，输出警告信息
        console.warn('[copy-devtools-html] Source file not found:', panelSrc);
      }
    }
  };
};

// 导出 Vite 配置对象
export default defineConfig({
  // 配置插件列表：React 插件用于解析 TSX/JSX，自定义插件用于文件移动和复制
  plugins: [react(), movePopupHtml(), copyDevtoolsHtml()], // 保留TSX解析能力
  // 构建配置选项
  build: {
    // 构建输出目录，所有构建产物将输出到此目录
    outDir: 'dist',
    // 是否压缩代码，false 表示不压缩（临时禁用压缩，方便验证）
    minify: false, // 临时禁用压缩，方便验证
    // 构建前是否清空输出目录，true 表示每次构建前清空
    emptyOutDir: true,
    // 构建目标，指定为 ES2020 语法
    target: 'es2020',
    // Rollup 打包选项（Vite 基于 Rollup）
    rollupOptions: {
      // 保留多入口配置，覆盖所有插件模块
      // 定义多个入口文件，每个入口对应 Chrome 插件的一个模块
      input: {
        // content 脚本已移动到 vite.content.config.ts 中配置
        // content: 'src/content/index.tsx', // Moved to vite.content.config.ts
        // popup 入口：弹窗页面的 HTML 文件
        popup: 'src/popup/index.html',
        // background 入口：后台脚本的 TypeScript 文件
        background: 'src/background/index.ts',
        // devtools 入口：开发者工具脚本的 TypeScript 文件
        devtools: 'src/devtools/devtools.ts',
        // panel 入口：开发者工具面板的 TSX 文件
        'panel/panel': 'src/devtools/panel/panel.tsx'
      },
      // 输出配置选项
      output: {
        // 1. 保留：彻底禁用代码分割，不生成任何分离chunk（核心，消除assets目录）
        // 这是实现单文件的关键，替代inlineDynamicImports的核心作用
        // 设置为 null 表示不进行代码分割，所有代码打包到单个文件中
        manualChunks: null,
        // 2. 移除：inlineDynamicImports: true（与多入口冲突，不再使用）
        // 3. 保留：自定义每个入口的输出路径，匹配插件目录结构
        // 自定义入口文件的输出文件名，根据入口名称返回对应的输出路径
        entryFileNames: (chunkInfo) => {
          // 根据入口名称进行匹配
          switch (chunkInfo.name) {
            // popup 入口输出到 popup/index.js
            case 'popup':
              return 'popup/index.js';
            // background 入口输出到 background/index.js
            case 'background':
              return 'background/index.js';
            // devtools 入口输出到 devtools/devtools.js
            case 'devtools':
              return 'devtools/devtools.js';
            // panel 入口输出到 panel/panel.js
            case 'panel/panel':
              return 'panel/panel.js';
            // 默认情况下，使用 [name]/index.js 格式
            default:
              return '[name]/index.js';
          }
        },
        // 4. 保留：输出ES模块，适配Chrome插件
        // 输出格式为 ES 模块（ESM），Chrome 插件支持 ES 模块
        format: 'es',
        // 不导出任何内容，因为这是 Chrome 插件的脚本文件
        exports: 'none',
        // 5. 新增：禁用chunk文件命名，确保无额外hash文件生成
        // chunk 文件的命名格式，使用简单的 [name].js 格式，不添加 hash
        chunkFileNames: '[name].js'
      }
    },
    // 禁用库模式，避免与普通应用构建模式冲突
    lib: false // 禁用lib模式，避免冲突
  },
  // 保留：禁用依赖预构建，避免生成assets目录
  // 依赖优化配置
  optimizeDeps: {
    // 不自动发现依赖，禁用依赖预构建
    noDiscovery: true,
    // 需要预构建的依赖列表，空数组表示不预构建任何依赖
    include: []
  }
});
