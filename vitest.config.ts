import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest 配置 - 用于单元测试与组件测试
 * 运行: npm run test (watch) | npm run test:run (单次) | npm run test:coverage (覆盖率)
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/converters/**/*.ts', 'src/devtools/utils/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/types/**'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
