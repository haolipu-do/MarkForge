/**
 * @file src/components/header/WindowControls.tsx
 * @description 无边框窗口右上角原生控制按钮组（最小化、最大化/还原、关闭拦截）
 * @module 顶部导航与窗口栏
 */
import React from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: (e: React.MouseEvent) => void;
  onMaximize: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
}) => (
  <div className="flex items-center h-full ml-1 shrink-0">
    <button
      type="button"
      onClick={onMinimize}
      className="w-11 h-[42px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
      title="最小化"
    >
      <Minus className="w-4 h-4 pointer-events-none" />
    </button>

    <button
      type="button"
      onClick={onMaximize}
      className="w-11 h-[42px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
      title={isMaximized ? '还原' : '最大化'}
    >
      {isMaximized ? (
        <Copy className="w-3.5 h-3.5 pointer-events-none" />
      ) : (
        <Square className="w-3.5 h-3.5 pointer-events-none" />
      )}
    </button>

    <button
      type="button"
      onClick={onClose}
      className="w-11 h-[42px] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
      title="关闭"
    >
      <X className="w-4 h-4 pointer-events-none" />
    </button>
  </div>
);
