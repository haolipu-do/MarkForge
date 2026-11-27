/**
 * @file src/components/ui/DropdownMenu.tsx
 * @description 基于 @radix-ui/react-dropdown-menu 封装的主题化下拉菜单、子菜单及快捷键菜单项基础组件
 * @module 通用 UI 组件库
 */
import React from 'react';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';

export const DropdownRoot = RadixDropdown.Root;
export const DropdownTrigger = RadixDropdown.Trigger;
export const DropdownPortal = RadixDropdown.Portal;
export const DropdownSub = RadixDropdown.Sub;
export const DropdownSubTrigger = RadixDropdown.SubTrigger;

export const DropdownContent: React.FC<{
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  onPointerDownOutside?: (e: Event) => void;
  onFocusOutside?: (e: Event) => void;
  onCloseAutoFocus?: (e: Event) => void;
}> = ({
  children,
  className = 'w-56',
  align = 'start',
  sideOffset = 4,
  onPointerDownOutside,
  onFocusOutside,
  onCloseAutoFocus,
}) => (
  <RadixDropdown.Portal>
    <RadixDropdown.Content
      align={align}
      sideOffset={sideOffset}
      collisionPadding={8}
      onPointerDownOutside={onPointerDownOutside}
      onFocusOutside={onFocusOutside}
      onCloseAutoFocus={onCloseAutoFocus}
      className={`${className} bg-[var(--bg-header)] border border-[var(--border-subtle)] rounded-xl shadow-2xl py-1 z-[9999] text-xs select-none animate-in fade-in zoom-in-95 duration-100 focus:outline-none`}
    >
      {children}
    </RadixDropdown.Content>
  </RadixDropdown.Portal>
);

export const DropdownSubContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = 'w-56' }) => (
  <RadixDropdown.Portal>
    <RadixDropdown.SubContent
      sideOffset={2}
      alignOffset={-4}
      collisionPadding={8}
      className={`${className} bg-[var(--bg-header)] border border-[var(--border-subtle)] rounded-xl shadow-2xl py-1 z-[10000] text-xs select-none animate-in fade-in duration-100 focus:outline-none`}
    >
      {children}
    </RadixDropdown.SubContent>
  </RadixDropdown.Portal>
);

export const DropdownSeparator: React.FC = () => (
  <RadixDropdown.Separator className="my-1 border-t border-[var(--border-subtle)]" />
);

interface DropdownItemProps {
  onSelect?: () => void;
  icon?: React.ReactNode;
  label: React.ReactNode;
  shortcut?: string;
  rightSlot?: React.ReactNode;
  danger?: boolean;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  onSelect,
  icon,
  label,
  shortcut,
  rightSlot,
  danger,
  className = '',
}) => (
  <RadixDropdown.Item
    onSelect={onSelect}
    className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer outline-none transition-colors ${
      danger
        ? 'hover:bg-rose-500/10 focus:bg-rose-500/10 text-rose-500 font-medium'
        : 'hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-hover)] text-[var(--text-primary)]'
    } ${className}`}
  >
    <span className="flex items-center gap-2 truncate">
      {icon}
      <span>{label}</span>
    </span>
    {(shortcut || rightSlot) && (
      <span className="flex items-center gap-1.5 shrink-0 ml-2">
        {shortcut && <span className="text-[10px] text-[var(--text-muted)] font-mono">{shortcut}</span>}
        {rightSlot}
      </span>
    )}
  </RadixDropdown.Item>
);

export const DropdownSubTriggerItem: React.FC<{
  icon?: React.ReactNode;
  label: React.ReactNode;
}> = ({ icon, label }) => (
  <RadixDropdown.SubTrigger className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-hover)] data-[state=open]:bg-[var(--bg-hover)] flex items-center justify-between text-[var(--text-primary)] cursor-pointer select-none font-medium outline-none">
    <span className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </span>
    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
  </RadixDropdown.SubTrigger>
);
