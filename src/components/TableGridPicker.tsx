/**
 * @file src/components/TableGridPicker.tsx
 * @description 可视化 8x10 网格选择器组件，支持鼠标框选或行列微调快速插入 Markdown 表格
 * @module 表格交互浮窗模块
 */
import React, { useState, useEffect, useRef } from 'react';
import { Table, Sparkles, Check } from 'lucide-react';
import { CloseButton } from './ui/CloseButton';

interface TableGridPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
  anchorPosition?: { top: number; left: number } | null;
}

const MAX_GRID_ROWS = 8;
const MAX_GRID_COLS = 10;

export const TableGridPicker: React.FC<TableGridPickerProps> = ({
  isOpen,
  onClose,
  onInsert,
  anchorPosition,
}) => {
  const [hoverRows, setHoverRows] = useState(3);
  const [hoverCols, setHoverCols] = useState(3);
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        // Direct Enter inserts
        onInsert(hoverRows, hoverCols);
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Check if click was on the toolbar table button
        const target = e.target as HTMLElement;
        if (target.closest('.vditor-toolbar button[data-type="table"]')) return;
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, hoverRows, hoverCols, onClose, onInsert]);

  if (!isOpen) return null;

  const handleCustomInsert = (e: React.FormEvent) => {
    e.preventDefault();
    onInsert(customRows, customCols);
    onClose();
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
      className="table-toolbar-popover rounded-xl shadow-2xl p-3.5 w-72 text-xs select-none backdrop-blur animate-in fade-in duration-150"
    >
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)] text-[var(--text-heading)]">
        <div className="flex items-center gap-1.5 font-semibold text-xs">
          <Table className="w-4 h-4 text-sky-400" />
          <span>插入表格</span>
          <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-mono">Ctrl+T</span>
        </div>
        <CloseButton onClick={onClose} size="sm" />
      </div>

      {/* Grid Hover Dimension Display */}
      <div className="flex items-center justify-between mb-2 px-1 text-[var(--text-primary)]">
        <span className="text-[11px] text-[var(--text-muted)]">滑动选择尺寸：</span>
        <span className="font-bold text-sky-400 text-xs font-mono">
          {hoverRows} 行 × {hoverCols} 列
        </span>
      </div>

      {/* Visual Interactive Matrix */}
      <div 
        className="grid gap-1 p-1 bg-zinc-900/60 dark:bg-black/40 rounded-lg border border-[var(--border-subtle)] mb-3"
        style={{
          gridTemplateColumns: `repeat(${MAX_GRID_COLS}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => {
          setHoverRows(3);
          setHoverCols(3);
        }}
      >
        {Array.from({ length: MAX_GRID_ROWS }).map((_, r) =>
          Array.from({ length: MAX_GRID_COLS }).map((_, c) => {
            const isHighlighted = r < hoverRows && c < hoverCols;
            return (
              <div
                key={`${r}-${c}`}
                onMouseEnter={() => {
                  setHoverRows(r + 1);
                  setHoverCols(c + 1);
                }}
                onClick={() => {
                  onInsert(r + 1, c + 1);
                  onClose();
                }}
                className={`h-4 rounded-sm cursor-pointer transition-colors ${
                  isHighlighted
                    ? 'bg-sky-500 border border-sky-400 shadow-sm shadow-sky-500/40'
                    : 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/50'
                }`}
              />
            );
          })
        )}
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[10px] text-[var(--text-muted)] shrink-0">预设：</span>
        {[
          { r: 2, c: 2, label: '2×2 极简' },
          { r: 3, c: 4, label: '3×4 标准' },
          { r: 5, c: 5, label: '5×5 矩阵' },
        ].map(preset => (
          <button
            key={preset.label}
            onClick={() => {
              onInsert(preset.r, preset.c);
              onClose();
            }}
            className="flex-1 py-1 px-1.5 text-center text-[10px] rounded bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-400 border border-[var(--border-subtle)] transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Dimension Input */}
      <form onSubmit={handleCustomInsert} className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-1 flex-1">
          <input
            type="number"
            min={1}
            max={50}
            value={customRows}
            onChange={e => setCustomRows(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 px-1.5 py-1 text-center bg-zinc-800/90 border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] font-mono focus:border-sky-500 focus:outline-none"
            title="行数"
          />
          <span className="text-[var(--text-muted)]">×</span>
          <input
            type="number"
            min={1}
            max={20}
            value={customCols}
            onChange={e => setCustomCols(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 px-1.5 py-1 text-center bg-zinc-800/90 border border-[var(--border-subtle)] rounded text-xs text-[var(--text-primary)] font-mono focus:border-sky-500 focus:outline-none"
            title="列数"
          />
        </div>

        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-medium rounded shadow transition-transform"
        >
          <Check className="w-3.5 h-3.5" />
          <span>插入</span>
        </button>
      </form>
    </div>
  );
};
