import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // 解析TSX/JSX
import fs from 'fs';
import path from 'path';

// Custom plugin to move popup HTML
const movePopupHtml = () => {
  return {
    name: 'move-popup-html',
    closeBundle() {
      const srcPath = path.resolve(__dirname, 'dist/src/popup/index.html');
      const destPath = path.resolve(__dirname, 'dist/popup/index.html');
      
      if (fs.existsSync(srcPath)) {
        // Ensure dest dir exists (it should, but safety first)
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        fs.renameSync(srcPath, destPath);
        console.log('[move-popup-html] Moved index.html to dist/popup/');
        
        // Clean up empty src dir
        try {
          const srcDir = path.resolve(__dirname, 'dist/src');
          if (fs.existsSync(srcDir)) {
             fs.rmSync(srcDir, { recursive: true, force: true });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  };
};

// Custom plugin to copy devtools HTML files
const copyDevtoolsHtml = () => {
  return {
    name: 'copy-devtools-html',
    closeBundle() {
      // Copy devtools.html from src to dist
      const devtoolsSrc = path.resolve(__dirname, 'src/devtools/devtools.html');
      const devtoolsDest = path.resolve(__dirname, 'dist/devtools/devtools.html');
      
      if (fs.existsSync(devtoolsSrc)) {
        const destDir = path.dirname(devtoolsDest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(devtoolsSrc, devtoolsDest);
        console.log('[copy-devtools-html] Copied devtools.html to dist/devtools/');
      } else {
        console.warn('[copy-devtools-html] Source file not found:', devtoolsSrc);
      }

      // Copy panel.html from src to dist
      const panelSrc = path.resolve(__dirname, 'src/devtools/panel/panel.html');
      const panelDest = path.resolve(__dirname, 'dist/panel/panel.html');
      
      if (fs.existsSync(panelSrc)) {
        const destDir = path.dirname(panelDest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(panelSrc, panelDest);
        console.log('[copy-devtools-html] Copied panel.html to dist/panel/');
      } else {
        console.warn('[copy-devtools-html] Source file not found:', panelSrc);
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), movePopupHtml(), copyDevtoolsHtml()], // 保留TSX解析能力
  build: {
    outDir: 'dist',
    minify: false, // 临时禁用压缩，方便验证
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      // 保留多入口配置，覆盖所有插件模块
      input: {
        // content: 'src/content/index.tsx', // Moved to vite.content.config.ts
        popup: 'src/popup/index.html',
        background: 'src/background/index.ts',
        devtools: 'src/devtools/devtools.ts',
        'panel/panel': 'src/devtools/panel/panel.tsx'
      },
      output: {
        // 1. 保留：彻底禁用代码分割，不生成任何分离chunk（核心，消除assets目录）
        // 这是实现单文件的关键，替代inlineDynamicImports的核心作用
        manualChunks: null,
        // 2. 移除：inlineDynamicImports: true（与多入口冲突，不再使用）
        // 3. 保留：自定义每个入口的输出路径，匹配插件目录结构
        entryFileNames: (chunkInfo) => {
          switch (chunkInfo.name) {
            case 'popup':
              return 'popup/index.js';
            case 'background':
              return 'background/index.js';
            case 'devtools':
              return 'devtools/devtools.js';
            case 'panel/panel':
              return 'panel/panel.js';
            default:
              return '[name]/index.js';
          }
        },
        // 4. 保留：输出ES模块，适配Chrome插件
        format: 'es',
        exports: 'none',
        // 5. 新增：禁用chunk文件命名，确保无额外hash文件生成
        chunkFileNames: '[name].js'
      }
    },
    lib: false // 禁用lib模式，避免冲突
  },
  // 保留：禁用依赖预构建，避免生成assets目录
  optimizeDeps: {
    noDiscovery: true,
    include: []
  }
});
