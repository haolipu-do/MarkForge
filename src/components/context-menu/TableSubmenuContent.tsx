/**
 * @file src/components/context-menu/TableSubmenuContent.tsx
 * @description 右键菜单表格工具子菜单，提供行/列增删移动、对齐设置、Markdown 复制与表格源码格式化指令
 * @module 编辑器右键菜单模块
 */
import React from 'react';
import {
  ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash2,
  AlignLeft, AlignCenter, AlignRight, Wand2, Copy,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface TableSubmenuContentProps {
  onAction: (cmd: string) => void;
}

interface TableMenuItem {
  cmd: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  danger?: boolean;
}

const ROW_ACTIONS: TableMenuItem[] = [
  { cmd: 'insert-row-above', label: '上方插入行', icon: ArrowUpToLine, color: 'text-emerald-400' },
  { cmd: 'insert-row-below', label: '下方插入行', shortcut: 'Ctrl+Enter', icon: ArrowDownToLine, color: 'text-emerald-400' },
  { cmd: 'move-row-up', label: '上移该行', shortcut: 'Alt+↑', icon: ArrowUp, color: 'text-sky-400' },
  { cmd: 'move-row-down', label: '下移该行', shortcut: 'Alt+↓', icon: ArrowDown, color: 'text-sky-400' },
  { cmd: 'delete-row', label: '删除该行', shortcut: 'Ctrl+Shift+退格', icon: Trash2, danger: true },
];

const COL_ACTIONS: TableMenuItem[] = [
  { cmd: 'insert-col-left', label: '左侧插入列', icon: ArrowLeftToLine, color: 'text-emerald-400' },
  { cmd: 'insert-col-right', label: '右侧插入列', icon: ArrowRightToLine, color: 'text-emerald-400' },
  { cmd: 'move-col-left', label: '左移该列', shortcut: 'Alt+←', icon: ArrowLeft, color: 'text-sky-400' },
  { cmd: 'move-col-right', label: '右移该列', shortcut: 'Alt+→', icon: ArrowRight, color: 'text-sky-400' },
  { cmd: 'delete-col', label: '删除该列', icon: Trash2, danger: true },
];

const ALIGN_ITEMS = [
  { cmd: 'align-left', label: '居左对齐', icon: AlignLeft },
  { cmd: 'align-center', label: '居中对齐', icon: AlignCenter },
  { cmd: 'align-right', label: '居右对齐', icon: AlignRight },
];

export const TableSubmenuContent: React.FC<TableSubmenuContentProps> = ({ onAction }) => {
  const renderRows = (list: TableMenuItem[]) =>
    list.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.cmd}
          onClick={() => onAction(item.cmd)}
          className={`w-full flex items-center justify-between px-2 py-1 rounded text-left ${
            item.danger ? 'hover:bg-rose-500/20 text-rose-300' : 'hover:bg-white/10 text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon className={`w-3 h-3 ${item.danger ? 'text-rose-400' : item.color}`} />
            <span>{item.label}</span>
          </div>
          {item.shortcut && (
            <span className={`text-[10px] font-mono ${item.danger ? 'text-rose-300' : 'text-gray-400'}`}>
              {item.shortcut}
            </span>
          )}
        </button>
      );
    });

  return (
    <>
      <div className="text-[10px] font-semibold text-gray-400 px-2 py-0.5">行控制</div>
      {renderRows(ROW_ACTIONS)}

      <div className="h-[1px] bg-white/10 my-1" />
      <div className="text-[10px] font-semibold text-gray-400 px-2 py-0.5">列控制</div>
      {renderRows(COL_ACTIONS)}

      <div className="h-[1px] bg-white/10 my-1" />
      <div className="text-[10px] font-semibold text-gray-400 px-2 py-0.5">列对齐</div>
      <div className="flex items-center gap-1 px-1 py-0.5">
        {ALIGN_ITEMS.map(({ cmd, label, icon: Icon }) => (
          <Tooltip key={cmd} content={label} side="top">
            <button
              onClick={() => onAction(cmd)}
              className="flex-1 py-1 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300"
              aria-label={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="h-[1px] bg-white/10 my-1" />
      <button onClick={() => onAction('format-source')} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 text-gray-200 text-left">
        <Wand2 className="w-3 h-3 text-purple-400" />
        <span>格式化表格源码</span>
      </button>
      <button onClick={() => onAction('copy-table')} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 text-gray-200 text-left">
        <Copy className="w-3 h-3 text-sky-400" />
        <span>复制表格</span>
      </button>
      <button onClick={() => onAction('delete-table')} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-rose-500/20 text-rose-300 text-left font-medium">
        <Trash2 className="w-3 h-3 text-rose-400" />
        <span>删除表格</span>
      </button>
    </>
  );
};
