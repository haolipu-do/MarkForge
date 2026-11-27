/**
 * @file vite.config.ts
 * @description Vite 前端开发服务器与生产构建配置（相对资源基准路径、路径别名及输出目录）
 * @module 构建与工程配置
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
