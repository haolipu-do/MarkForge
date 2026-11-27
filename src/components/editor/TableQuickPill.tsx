/**
 * @file src/components/editor/TableQuickPill.tsx
 * @description 光标位于表格内部时在编辑器右上角呈现的紧凑型快捷控制胶囊（加行、删行、展开工具箱）
 * @module 核心编辑器子组件
 */
import React from 'react';
import { Table } from 'lucide-react';
import { TableContext } from '../../utils/tableOperations';

interface TableQuickPillProps {
  tableContext: TableContext;
  onAction: (action: string) => void;
  onToggleToolbox: () => void;
}

/** Floating quick control pill shown in the editor top-right when cursor is inside a table. */
export const TableQuickPill: React.FC<TableQuickPillProps> = ({
  tableContext,
  onAction,
  onToggleToolbox,
}) => {
  if (!tableContext.inTable) return null;

  return (
    <div className="table-quick-pill absolute top-12 right-6 z-20 flex items-center gap-1.5 bg-[var(--bg-card)]/95 backdrop-blur border border-sky-500/40 rounded-full pl-3 pr-1.5 py-1 shadow-2xl text-xs animate-in fade-in slide-in-from-top-2">
      <Table className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      <span className="font-semibold text-[var(--text-heading)] text-[11px]">
        第 {tableContext.rowIndex + 1}/{tableContext.totalRows}行 · {tableContext.colIndex + 1}/{tableContext.totalCols}列
      </span>
      <div className="h-3 w-[1px] bg-[var(--border-subtle)] mx-0.5" />
      <button
        onClick={() => onAction('insert-row-below')}
        className="px-2 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-medium transition-colors"
        title="在下方插入新行 (Ctrl+Enter)"
      >
        +加行
      </button>
      <button
        onClick={() => onAction('delete-row')}
        className="px-2 py-0.5 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 text-[10px] font-medium transition-colors"
        title="删除当前行 (Ctrl+Shift+退格)"
      >
        -删行
      </button>
      <button
        onClick={onToggleToolbox}
        className="px-2.5 py-0.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-medium shadow-sm transition-transform active:scale-95"
        title="展开完整表格工具箱 (Ctrl+T)"
      >
        表格工具箱 ⚙️
      </button>
    </div>
  );
};
