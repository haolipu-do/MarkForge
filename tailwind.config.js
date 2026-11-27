/**
 * @file tailwind.config.js
 * @description Tailwind CSS 配置，声明扫描路径、class 深色模式及基于 CSS 变量的语义化配色
 * @module 构建与工程配置
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        sidebar: 'var(--bg-sidebar)',
        header: 'var(--bg-header)',
        card: 'var(--bg-card)',
        hover: 'var(--bg-hover)',
        primary: 'var(--text-primary)',
        heading: 'var(--text-heading)',
        muted: 'var(--text-muted)',
      },
    },
  },
  plugins: [],
}
