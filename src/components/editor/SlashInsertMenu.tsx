/**
 * @file src/components/editor/SlashInsertMenu.tsx
 * @description 编辑器右下角悬浮“快捷排版”组件，一键插入 Callout 卡片、公式块、Mermaid 图表、表格与幻灯片分页符
 * @module 核心编辑器子组件
 */
import React from 'react';
import {
  Table,
  AlertTriangle,
  Sigma,
  GitBranch,
  Sparkles,
  Columns,
} from 'lucide-react';

interface SlashInsertMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (template: string) => void;
}

const SLASH_ITEMS = [
  {
    label: '提示块 (Callout Note)',
    desc: 'GitHub 风格高亮卡片',
    icon: AlertTriangle,
    color: 'text-sky-400',
    template: '\n> [!NOTE]\n> 这里是重要提示信息内容。\n\n',
  },
  {
    label: '警告块 (Callout Warning)',
    desc: '琥珀金高辨识警告',
    icon: AlertTriangle,
    color: 'text-amber-400',
    template: '\n> [!WARNING]\n> 注意：这里是警告提示信息。\n\n',
  },
  {
    label: 'LaTeX 数学公式块',
    desc: 'KaTeX 高亮公式',
    icon: Sigma,
    color: 'text-emerald-400',
    template: '\n$$\nE = mc^2\n$$\n\n',
  },
  {
    label: 'Mermaid 流程图',
    desc: '流程图/时序图/甘特图',
    icon: GitBranch,
    color: 'text-purple-400',
    template: '\n```mermaid\ngraph TD;\n    A[开始] --> B{判断分支};\n    B -->|是| C[执行操作];\n    B -->|否| D[结束];\n```\n\n',
  },
  {
    label: '格式化表格',
    desc: '带对齐标记的标准表格',
    icon: Table,
    color: 'text-blue-400',
    template: '\n| 序号 | 功能模块 | 状态 | 说明 |\n| :--- | :--- | :---: | :--- |\n| 1 | 所见即所得 | 已完成 | 极速流畅体验 |\n| 2 | 高对比深色 | 已完成 | 字体清晰锐利 |\n\n',
  },
  {
    label: '幻灯片分页符 (---)',
    desc: '用于 Slide 演示切页',
    icon: Columns,
    color: 'text-rose-400',
    template: '\n---\n\n',
  },
];

/** Floating bottom-right quick block insertion menu. */
export const SlashInsertMenu: React.FC<SlashInsertMenuProps> = ({
  menuRef,
  isOpen,
  onToggle,
  onInsert,
}) => (
  <div ref={menuRef} className="absolute bottom-3 right-5 z-20 flex items-center gap-1.5">
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="快捷插入组件 (Esc 关闭)"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>快捷排版</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-2 z-30 text-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase px-2 py-1">
            快捷插入块元素
          </div>

          <div className="space-y-0.5">
            {SLASH_ITEMS.map(({ label, desc, icon: Icon, color, template }) => (
              <button
                key={label}
                onClick={() => onInsert(template)}
                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[var(--bg-hover)] flex items-center gap-2 text-[var(--text-primary)]"
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);
