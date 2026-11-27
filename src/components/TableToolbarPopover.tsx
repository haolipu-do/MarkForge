/**
 * @file src/components/TableToolbarPopover.tsx
 * @description 14 项表格控制中心浮窗，集成行列增删、上下左右位移、列对齐、源码格式化及整表操作
 * @module 表格交互浮窗模块
 */
import React, { useEffect, useRef, useState } from 'react';
import { 
  Table, 
  ArrowUpToLine, 
  ArrowDownToLine, 
  ArrowLeftToLine, 
  ArrowRightToLine, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Trash, 
  Copy, 
  Wand2, 
  XCircle, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Check
} from 'lucide-react';
import { CloseButton } from './ui/CloseButton';
import { TableContext } from '../utils/tableOperations';

interface TableToolbarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  context: TableContext;
  onAction: (action: string, payload?: any) => void;
  anchorPosition?: { top: number; left: number } | null;
}

export const TableToolbarPopover: React.FC<TableToolbarPopoverProps> = ({
  isOpen,
  onClose,
  context,
  onAction,
  anchorPosition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest('.vditor-toolbar button[data-type="table"]') || target.closest('.table-quick-pill')) return;
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    onAction('copy-table');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFormat = () => {
    onAction('format-table');
    setFormatted(true);
    setTimeout(() => setFormatted(false), 1200);
  };

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${anchorPosition?.top ?? 86}px`,
    left: `${anchorPosition?.left ?? 300}px`,
    zIndex: 999999,
  };

  return (
    <div
      ref={containerRef}
      style={style}
      className="table-toolbar-popover rounded-xl shadow-2xl p-3 w-80 text-xs select-none backdrop-blur animate-in fade-in duration-150"
    >
      {/* Title Header with Row/Col indicator */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)] text-[var(--text-heading)]">
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          <Table className="w-4 h-4 text-sky-400" />
          <span>表格操作工具箱</span>
          {context.inTable && (
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
              第 {context.rowIndex + 1}/{context.totalRows} 行 · 第 {context.colIndex + 1}/{context.totalCols} 列
            </span>
          )}
        </div>
        <CloseButton onClick={onClose} size="sm" />
      </div>

      {/* Row & Column Insertion Group */}
      <div className="mb-2.5">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
          行列插入
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => { onAction('insert-row-above'); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpToLine className="w-3.5 h-3.5 text-sky-400" /> 上方插入行
            </span>
          </button>

          <button
            onClick={() => { onAction('insert-row-below'); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" /> 下方插入行
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Ctrl+Enter</span>
          </button>

          <button
            onClick={() => { onAction('insert-col-left'); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeftToLine className="w-3.5 h-3.5 text-blue-400" /> 左侧插入列
            </span>
          </button>

          <button
            onClick={() => { onAction('insert-col-right'); onClose(); }}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowRightToLine className="w-3.5 h-3.5 text-indigo-400" /> 右侧插入列
            </span>
          </button>
        </div>
      </div>

      {/* Row & Column Movement Group */}
      <div className="mb-2.5">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
          行列位置移动
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => { onAction('move-row-up'); }}
            disabled={context.isHeader}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> 上移该行
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Alt+↑</span>
          </button>

          <button
            onClick={() => { onAction('move-row-down'); }}
            disabled={context.isHeader}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-amber-400" /> 下移该行
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Alt+↓</span>
          </button>

          <button
            onClick={() => { onAction('move-col-left'); }}
            disabled={context.colIndex <= 0}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" /> 左移该列
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Alt+←</span>
          </button>

          <button
            onClick={() => { onAction('move-col-right'); }}
            disabled={context.colIndex >= context.totalCols - 1}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 disabled:opacity-40 disabled:pointer-events-none text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" /> 右移该列
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">Alt+→</span>
          </button>
        </div>
      </div>

      {/* Alignment Group */}
      <div className="mb-2.5">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wider">
          当前列对齐
        </div>
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => onAction('set-align', 'left')}
            className={`flex-1 py-1 rounded flex items-center justify-center gap-1 text-[11px] transition-colors ${
              context.currentAlign === 'left' || !context.currentAlign
                ? 'bg-sky-500 text-white font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" /> 居左
          </button>
          <button
            onClick={() => onAction('set-align', 'center')}
            className={`flex-1 py-1 rounded flex items-center justify-center gap-1 text-[11px] transition-colors ${
              context.currentAlign === 'center'
                ? 'bg-sky-500 text-white font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlignCenter className="w-3.5 h-3.5" /> 居中
          </button>
          <button
            onClick={() => onAction('set-align', 'right')}
            className={`flex-1 py-1 rounded flex items-center justify-center gap-1 text-[11px] transition-colors ${
              context.currentAlign === 'right'
                ? 'bg-sky-500 text-white font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <AlignRight className="w-3.5 h-3.5" /> 居右
          </button>
        </div>
      </div>

      {/* Format & Copy Group */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5 pt-2 border-t border-[var(--border-subtle)]">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">已复制源码</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-purple-400" />
              <span>复制表格</span>
            </>
          )}
        </button>

        <button
          onClick={handleFormat}
          className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
        >
          {formatted ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">已对齐排版</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>格式化表格</span>
            </>
          )}
        </button>
      </div>

      {/* Deletion Group */}
      <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-1.5">
        <button
          onClick={() => { onAction('delete-row'); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
          title="删除当前行 (Ctrl+Shift+退格)"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除行</span>
        </button>

        <button
          onClick={() => { onAction('delete-col'); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
          title="删除当前列"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>删除列</span>
        </button>

        <button
          onClick={() => { onAction('delete-table'); onClose(); }}
          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium shadow transition-colors"
          title="彻底移除整张表格"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>删整表</span>
        </button>
      </div>
    </div>
  );
};
