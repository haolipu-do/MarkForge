/**
 * @file src/components/ui/CloseButton.tsx
 * @description 统一的无焦点外框关闭按钮组件，移除浏览器默认圆形焦点环线
 * @module 通用 UI 组件库
 */
import React from 'react';
import { X } from 'lucide-react';

interface CloseButtonProps {
  onClick: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<CloseButtonProps['size']>, { btn: string; icon: string }> = {
  sm: { btn: 'p-1 rounded-md', icon: 'w-3.5 h-3.5' },
  md: { btn: 'p-1.5 rounded-full', icon: 'w-4 h-4' },
  lg: { btn: 'p-2 rounded-full', icon: 'w-5 h-5' },
};

/** Unified modal/popover close button without focus ring outline. */
export const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  title = '关闭 (Esc)',
  size = 'md',
  className = '',
  iconClassName = '',
}) => {
  const { btn, icon } = SIZE_CLASSES[size];
  return (
    <button
      type="button"
      data-mf-close-btn
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`${btn} border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer ${className}`}
    >
      <X className={`${icon} ${iconClassName}`} />
    </button>
  );
};
