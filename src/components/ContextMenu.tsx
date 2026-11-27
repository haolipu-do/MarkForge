/**
 * @file src/components/ContextMenu.tsx
 * @description 编辑器自定义智能右键上下文菜单，集成剪贴板、格式工具箱、智能排版与表格/链接/图片子菜单
 * @module 编辑器右键菜单模块
 */
import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import {
  Search, Scissors, Copy, Clipboard, Trash2, CheckSquare, Bold, Italic,
  Strikethrough, Code, Link as LinkIcon, Quote, List, ListOrdered, Highlighter,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Type,
  Table as TableIcon, Image as ImageIcon, Minus, Sparkles, AlertTriangle,
  ChevronRight, Sigma, Smile, BookOpen,
} from 'lucide-react';
import { TableContext } from '../utils/tableOperations';
import { Tooltip, TooltipProvider } from './ui/Tooltip';
import { LinkAndImageActions } from './context-menu/LinkAndImageActions';
import { TableSubmenuContent } from './context-menu/TableSubmenuContent';

export interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  selectedText: string;
  hasSelection: boolean;
  isInTable: boolean;
  tableContext: TableContext | null;
  targetLink: { href: string; text: string; isInternal?: boolean } | null;
  targetImage: { src: string; alt: string } | null;
  onExecuteCommand: (command: string, payload?: any) => void;
}

const ROW1_TOOLS = [
  { id: 'bold', label: '加粗', shortcut: 'Ctrl+B', icon: Bold },
  { id: 'italic', label: '斜体', shortcut: 'Ctrl+I', icon: Italic },
  { id: 'strike', label: '删除线', shortcut: 'Alt+Shift+5', icon: Strikethrough },
  { id: 'inline-code', label: '行内代码', shortcut: '`', icon: Code, mono: true },
  { id: 'link', label: '插入超链接', shortcut: 'Ctrl+K', icon: LinkIcon },
];

const ROW2_TOOLS = [
  { id: 'quote', label: '引用语法块', shortcut: 'Ctrl+Shift+Q', icon: Quote },
  { id: 'list', label: '无序列表', shortcut: 'Ctrl+Shift+]', icon: List },
  { id: 'ordered-list', label: '有序列表', shortcut: 'Ctrl+Shift+[', icon: ListOrdered },
  { id: 'check', label: '任务清单', shortcut: 'Ctrl+Shift+X', icon: CheckSquare },
  { id: 'highlight', label: '高亮标记', shortcut: '==文本==', icon: Highlighter, highlight: true },
];

const PARAGRAPH_ITEMS = [
  { cmd: 'heading-1', label: '一级标题', shortcut: 'Ctrl+1', icon: Heading1, color: 'text-sky-400', textCls: 'font-semibold text-sm' },
  { cmd: 'heading-2', label: '二级标题', shortcut: 'Ctrl+2', icon: Heading2, color: 'text-sky-400', textCls: 'font-medium' },
  { cmd: 'heading-3', label: '三级标题', shortcut: 'Ctrl+3', icon: Heading3, color: 'text-sky-400' },
  { cmd: 'heading-4', label: '四级标题', shortcut: 'Ctrl+4', icon: Heading4, color: 'text-gray-400' },
  { cmd: 'heading-5', label: '五级标题', shortcut: 'Ctrl+5', icon: Heading5, color: 'text-gray-400' },
  { cmd: 'heading-6', label: '六级标题', shortcut: 'Ctrl+6', icon: Heading6, color: 'text-gray-400' },
];

const INSERT_ITEMS = [
  { cmd: 'insert-table', label: '表格...', shortcut: 'Ctrl+T', icon: TableIcon, color: 'text-sky-400' },
  { cmd: 'insert-image', label: '图像...', shortcut: 'Ctrl+Shift+I', icon: ImageIcon, color: 'text-emerald-400' },
  { cmd: 'insert-link', label: '超链接', shortcut: 'Ctrl+K', icon: LinkIcon, color: 'text-blue-400' },
  { cmd: 'insert-line', label: '水平分割线', shortcut: '---', icon: Minus, color: 'text-gray-400' },
];

const INSERT_BLOCK_ITEMS = [
  { cmd: 'insert-callout', payload: 'NOTE', label: '警告高亮块 (Callout)', shortcut: 'Note', icon: AlertTriangle, color: 'text-amber-400' },
  { cmd: 'insert-toc', label: '内容目录导航', shortcut: '[TOC]', icon: BookOpen, color: 'text-cyan-400' },
  { cmd: 'insert-emoji', label: '表情 Emoji', shortcut: ':smile:', icon: Smile, color: 'text-yellow-400' },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  x,
  y,
  selectedText,
  hasSelection,
  isInTable,
  tableContext,
  targetLink,
  targetImage,
  onExecuteCommand,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [coords, setCoords] = useState({ left: x, top: y, flipLeft: false, flipUp: false });
  const submenuTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelCloseSubmenu = () => {
    if (submenuTimerRef.current) {
      clearTimeout(submenuTimerRef.current);
      submenuTimerRef.current = null;
    }
  };

  const openSubmenu = (menuKey: string) => {
    cancelCloseSubmenu();
    setActiveSubmenu(menuKey);
  };

  const closeSubmenuWithDelay = () => {
    cancelCloseSubmenu();
    submenuTimerRef.current = setTimeout(() => setActiveSubmenu(null), 220);
  };

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    let left = x;
    let top = y;
    let flipLeft = false;
    let flipUp = false;

    if (left + 260 > sw - 16) {
      left = Math.max(12, sw - 270);
      flipLeft = true;
    } else if (left + 490 > sw - 16) {
      flipLeft = true;
    }
    if (top + rect.height > sh - 16) {
      top = Math.max(12, sh - rect.height - 16);
      flipUp = true;
    }
    setCoords({ left, top, flipLeft, flipUp });
  }, [isOpen, x, y, isInTable, targetLink, targetImage]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown, true);
    return () => {
      cancelCloseSubmenu();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (cmd: string, payload?: any) => {
    cancelCloseSubmenu();
    onExecuteCommand(cmd, payload);
    onClose();
  };

  const previewQuery = selectedText ? (selectedText.length > 12 ? selectedText.slice(0, 12) + '...' : selectedText) : '';

  const renderSubmenu = (
    key: string,
    trigger: React.ReactNode,
    content: React.ReactNode,
    triggerCls = 'hover:bg-white/10 text-gray-200',
    panelCls = 'w-52'
  ) => (
    <div className="relative" onMouseEnter={() => openSubmenu(key)} onMouseLeave={closeSubmenuWithDelay}>
      <button
        onClick={() => {
          cancelCloseSubmenu();
          setActiveSubmenu(activeSubmenu === key ? null : key);
        }}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors ${triggerCls}`}
      >
        {trigger}
      </button>
      {activeSubmenu === key && (
        <div
          onMouseEnter={cancelCloseSubmenu}
          onMouseLeave={closeSubmenuWithDelay}
          style={{
            [coords.flipLeft ? 'right' : 'left']: '100%',
            [coords.flipUp ? 'bottom' : 'top']: '-4px',
            [coords.flipLeft ? 'marginRight' : 'marginLeft']: '4px',
          }}
          className={`absolute z-50 ${panelCls} context-menu-submenu rounded-xl p-1.5 space-y-0.5 animate-in fade-in`}
        >
          <div className={`absolute top-0 bottom-0 ${coords.flipLeft ? '-right-3 w-4' : '-left-3 w-4'} bg-transparent pointer-events-auto`} />
          {content}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <div
        ref={menuRef}
        onMouseDown={(e) => e.preventDefault()}
        style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
        className="fixed z-[999999] w-[265px] context-menu-popover rounded-xl p-1.5 select-none font-sans text-xs animate-in fade-in zoom-in-95 duration-100"
      >
        <LinkAndImageActions targetLink={targetLink} targetImage={targetImage} onAction={handleAction} />

        {hasSelection && (
          <div className="relative mb-1">
            <button
              onClick={() => handleAction('local-search', { text: selectedText })}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-200 text-xs text-left"
            >
              <Search className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span className="truncate">在当前文档内检索 <span className="text-sky-300 font-medium">"{previewQuery}"</span></span>
            </button>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-1 py-1 bg-white/[0.04] rounded-lg mb-1.5 border border-white/5">
          {[
            { cmd: 'cut', label: '剪切', shortcut: 'Ctrl+X', icon: Scissors, needSel: true },
            { cmd: 'copy', label: '复制', shortcut: 'Ctrl+C', icon: Copy, needSel: true },
            { cmd: 'paste', label: '粘贴', shortcut: 'Ctrl+V', icon: Clipboard, needSel: false },
            { cmd: 'delete', label: '删除', shortcut: 'Delete', icon: Trash2, needSel: true, danger: true },
          ].map(({ cmd, label, shortcut, icon: Icon, needSel, danger }) => {
            const disabled = needSel && !hasSelection;
            return (
              <Tooltip key={cmd} content={`${label} (${shortcut})`} side="top">
                <button
                  onClick={() => !disabled && handleAction(cmd)}
                  disabled={disabled}
                  className={`flex-1 flex flex-col items-center justify-center py-1 rounded-md transition-colors ${
                    disabled
                      ? 'opacity-35 text-gray-500 cursor-not-allowed'
                      : danger
                        ? 'hover:bg-rose-500/20 text-rose-300'
                        : 'hover:bg-white/10 text-gray-200'
                  }`}
                  aria-label={`${label} (${shortcut})`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] mt-0.5">{label}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Copy / Paste As Submenu */}
        {renderSubmenu(
          'copy-as',
          <>
            <div className="flex items-center gap-2"><Copy className="w-3.5 h-3.5 text-gray-400" /><span>复制 / 粘贴为...</span></div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </>,
          <>
            <button onClick={() => handleAction('copy-plain')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <span>复制为纯文本</span><span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+C</span>
            </button>
            <button onClick={() => handleAction('copy-markdown')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <span>复制为 Markdown</span>
            </button>
            <button onClick={() => handleAction('copy-html')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <span>复制为 HTML 代码</span>
            </button>
            <div className="h-[1px] bg-white/10 my-1" />
            <button onClick={() => handleAction('paste-plain')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <span>粘贴为纯文本</span><span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+V</span>
            </button>
          </>
        )}

        <div className="h-[1px] bg-white/10 my-1" />

        {/* Formatting Icon Matrix */}
        <div className="p-1 bg-white/[0.03] rounded-lg border border-white/5 space-y-1 mb-1">
          {[ROW1_TOOLS, ROW2_TOOLS].map((row, rIdx) => (
            <div key={rIdx} className="flex items-center justify-between gap-1">
              {row.map((tool: any) => {
                const Icon = tool.icon;
                return (
                  <Tooltip key={tool.id} content={`${tool.label} (${tool.shortcut})`} side="top">
                    <button
                      onClick={() => handleAction(tool.id)}
                      className={`flex-1 h-7 flex items-center justify-center rounded ${
                        tool.highlight ? 'hover:bg-amber-500/20 hover:text-amber-300' : 'hover:bg-sky-500/20 hover:text-sky-300'
                      } text-gray-300 transition-colors ${tool.mono ? 'font-mono' : ''}`}
                      aria-label={`${tool.label} (${tool.shortcut})`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        <div className="h-[1px] bg-white/10 my-1" />

        {/* Paragraph Submenu */}
        {renderSubmenu(
          'paragraph',
          <>
            <div className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-gray-400" /><span>段落</span></div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </>,
          <>
            {PARAGRAPH_ITEMS.map(({ cmd, label, shortcut, icon: Icon, color, textCls }) => (
              <button key={cmd} onClick={() => handleAction(cmd)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
                <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className={textCls}>{label}</span></div>
                <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
              </button>
            ))}
            <div className="h-[1px] bg-white/10 my-1" />
            <button onClick={() => handleAction('heading-0')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <div className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-gray-400" /><span>段落 / 普通文本</span></div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+0</span>
            </button>
            <div className="h-[1px] bg-white/10 my-1" />
            <button onClick={() => handleAction('code-block')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <div className="flex items-center gap-2"><Code className="w-3.5 h-3.5 text-emerald-400" /><span>代码块</span></div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+K</span>
            </button>
            <button onClick={() => handleAction('math-block')} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
              <div className="flex items-center gap-2"><Sigma className="w-3.5 h-3.5 text-purple-400" /><span>公式块</span></div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+M</span>
            </button>
          </>
        )}

        {/* Insert Submenu */}
        {renderSubmenu(
          'insert',
          <>
            <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-gray-400" /><span>插入</span></div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </>,
          <>
            {INSERT_ITEMS.map(({ cmd, label, shortcut, icon: Icon, color }) => (
              <button key={cmd} onClick={() => handleAction(cmd)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
                <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${color}`} /><span>{label}</span></div>
                <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
              </button>
            ))}
            <div className="h-[1px] bg-white/10 my-1" />
            {INSERT_BLOCK_ITEMS.map(({ cmd, payload, label, shortcut, icon: Icon, color }) => (
              <button key={cmd} onClick={() => handleAction(cmd, payload)} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-gray-200 text-left">
                <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${color}`} /><span>{label}</span></div>
                <span className="text-[10px] text-gray-400 font-mono">{shortcut}</span>
              </button>
            ))}
          </>
        )}

        {/* Table Submenu */}
        {isInTable && (
          <>
            <div className="h-[1px] bg-white/10 my-1" />
            {renderSubmenu(
              'table',
              <>
                <div className="flex items-center gap-2">
                  <TableIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>表格操作 ({tableContext?.isHeader ? '表头' : `第 ${(tableContext?.rowIndex ?? 0) + 1} 行`} · 共 {tableContext?.totalRows} 行)</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
              </>,
              <TableSubmenuContent onAction={(cmd) => handleAction(cmd)} />,
              'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-medium',
              'w-56 max-h-[420px] overflow-y-auto'
            )}
          </>
        )}

        {hasSelection && (
          <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between px-2 text-[10px] text-gray-400">
            <span>已选中内容</span>
            <span className="font-mono text-sky-400">{selectedText.length} 字符</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
