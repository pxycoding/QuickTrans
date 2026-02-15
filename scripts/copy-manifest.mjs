import { copyFileSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 复制manifest.json到dist目录
const src = resolve(rootDir, 'src/manifest.json');
const dest = resolve(rootDir, 'dist/manifest.json');

try {
  copyFileSync(src, dest);
  console.log('✓ manifest.json copied to dist/');
} catch (error) {
  console.error('Failed to copy manifest.json:', error);
  process.exit(1);
}

// 自动更新 panel.html 中的 CSS 文件名
try {
  const assetsDir = resolve(rootDir, 'dist/assets');
  const panelHtmlPath = resolve(rootDir, 'dist/panel/panel.html');
  
  if (existsSync(assetsDir) && existsSync(panelHtmlPath)) {
    // 查找所有以 panel- 开头的 CSS 文件
    const files = readdirSync(assetsDir);
    const panelCssFile = files.find(file => file.startsWith('panel-') && file.endsWith('.css'));
    
    if (panelCssFile) {
      // 读取 panel.html
      let panelHtml = readFileSync(panelHtmlPath, 'utf-8');
      
      // 更新 <link> 标签中的 CSS 文件名
      const oldPattern = /href="\.\.\/assets\/panel-[^"]+\.css"/;
      const newHref = `href="../assets/${panelCssFile}"`;
      
      if (oldPattern.test(panelHtml)) {
        panelHtml = panelHtml.replace(oldPattern, newHref);
        writeFileSync(panelHtmlPath, panelHtml, 'utf-8');
        console.log('✓ Updated panel.html with CSS file:', panelCssFile);
      } else {
        // 如果没有找到 link 标签，尝试添加
        const linkTag = `  <link rel="stylesheet" href="../assets/${panelCssFile}">`;
        if (panelHtml.includes('</style>')) {
          panelHtml = panelHtml.replace('</style>', `</style>\n${linkTag}`);
          writeFileSync(panelHtmlPath, panelHtml, 'utf-8');
          console.log('✓ Added CSS link to panel.html:', panelCssFile);
        }
      }
    }
  }
} catch (error) {
  // 如果更新 CSS 失败，不影响构建流程
  console.warn('⚠ Failed to update panel CSS (non-fatal):', error.message);
}

