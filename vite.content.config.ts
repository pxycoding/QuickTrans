import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Do not clear dist, as this runs after the main build
    minify: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx')
      },
      output: {
        entryFileNames: 'content/index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'content/style.css';
          return 'assets/[name]-[hash][extname]';
        },
        format: 'iife', // Bundles everything (including React) into a single file
        name: 'ContentScript', // Required for IIFE
        extend: true,
        inlineDynamicImports: true // Forces all imports to be inlined
      }
    },
    cssCodeSplit: false
    // Ensure CSS is emitted if needed, though IIFE might handle it differently.
    // Vite usually emits CSS files alongside the JS entry.
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
});
