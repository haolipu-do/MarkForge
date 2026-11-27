/**
 * @file src/components/ui/Kbd.tsx
 * @description 统一按键徽章样式组件，用于快捷键手册、查找替换框与链接悬浮提示展示
 * @module 通用 UI 组件库
 */
import React from 'react';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '' }) => (
  <kbd
    className={`px-2 py-0.5 rounded font-mono text-[11px] bg-[var(--bg-canvas)] border border-[var(--border-strong)] text-sky-500 dark:text-sky-400 font-semibold shadow-sm shrink-0 ${className}`}
  >
    {children}
  </kbd>
);
