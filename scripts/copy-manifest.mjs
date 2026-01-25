import { copyFileSync } from 'fs';
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

