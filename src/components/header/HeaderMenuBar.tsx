/**
 * @file src/components/header/HeaderMenuBar.tsx
 * @description 顶部主菜单栏组件，基于数据配置与 Radix 下拉菜单渲染文件、编辑、段落、格式、视图、导出与帮助菜单
 * @module 顶部导航与窗口栏
 */
import React from 'react';
import {
  FileText, FolderOpen, Save, Download, Sun, Moon, Presentation, Maximize,
  Table, Type, ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash2, Trash, Wand2, XCircle,
  Scissors, Copy, Clipboard, Check, CheckSquare, Bold, Italic, Underline,
  Strikethrough, Code, Sigma, Highlighter, Quote, List, ListOrdered,
  Link as LinkIcon, Pin, PinOff, Eye, Keyboard, Search, Image as ImageIcon,
  Columns, ListTree, FileCode, Sparkles, Info, Terminal,
} from 'lucide-react';
import { CURRENT_APP_VERSION } from '../../data/changelog';
import type { EditorMode } from '../Editor';
import {
  DropdownRoot, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownSub, DropdownSubTriggerItem, DropdownSubContent,
} from '../ui/DropdownMenu';

export type MenuKey = 'file' | 'edit' | 'paragraph' | 'format' | 'view' | 'export' | 'help';

export interface HeaderMenuBarProps {
  openMenu: MenuKey | null;
  setOpenMenu: (m: MenuKey | null) => void;
  currentFileName: string;
  theme: 'light' | 'dark';
  isTypewriterMode: boolean;
  isFocusMode: boolean;
  isAlwaysOnTop: boolean;
  editorMode: EditorMode;
  isDevToolsOpen: boolean;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onQuickOpen: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onRevealInExplorer: () => void;
  onOpenOutline: () => void;
  onToggleTypewriterMode: () => void;
  onToggleFocusMode: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleSlideMode: () => void;
  onToggleZenMode: () => void;
  onToggleTheme: () => void;
  onSetEditorMode?: (mode: EditorMode) => void;
  onToggleDevTools?: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
  onExportImage: () => void;
  onExportText: (ext: string) => void;
  onShowShortcuts: () => void;
  onShowReleaseNotes: () => void;
  onShowAbout: () => void;
}

interface MenuEntry {
  type?: 'separator' | 'submenu-table';
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  rightSlot?: React.ReactNode;
  danger?: boolean;
  className?: string;
  onSelect?: () => void;
}

const HEADING_NAMES = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题'];

export const HeaderMenuBar: React.FC<HeaderMenuBarProps> = (props) => {
  const { openMenu, setOpenMenu } = props;

  const dispatchTable = (action: string, payload?: any) =>
    window.dispatchEvent(new CustomEvent('markforge-table-action', { detail: { action, payload } }));
  const dispatchHeading = (level: number) =>
    window.dispatchEvent(new CustomEvent('markforge-heading-action', { detail: { level } }));
  const dispatchFormat = (action: string, payload?: any) =>
    window.dispatchEvent(new CustomEvent('markforge-format-action', { detail: { action, payload } }));

  const tableSubmenuItems: MenuEntry[] = [
    { icon: <Table className="w-3.5 h-3.5 text-sky-400" />, label: '插入表格...', shortcut: 'Ctrl+T', className: 'font-medium', onSelect: () => dispatchTable('insert-table') },
    { type: 'separator' },
    { icon: <ArrowUpToLine className="w-3.5 h-3.5 text-sky-400" />, label: '上方插入行', onSelect: () => dispatchTable('insert-row-above') },
    { icon: <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />, label: '下方插入行', shortcut: 'Ctrl+Enter', onSelect: () => dispatchTable('insert-row-below') },
    { type: 'separator' },
    { icon: <ArrowLeftToLine className="w-3.5 h-3.5 text-blue-400" />, label: '左侧插入列', onSelect: () => dispatchTable('insert-col-left') },
    { icon: <ArrowRightToLine className="w-3.5 h-3.5 text-indigo-400" />, label: '右侧插入列', onSelect: () => dispatchTable('insert-col-right') },
    { type: 'separator' },
    { icon: <ArrowUp className="w-3.5 h-3.5 text-amber-400" />, label: '上移该行', shortcut: 'Alt+↑', onSelect: () => dispatchTable('move-row-up') },
    { icon: <ArrowDown className="w-3.5 h-3.5 text-amber-400" />, label: '下移该行', shortcut: 'Alt+↓', onSelect: () => dispatchTable('move-row-down') },
    { icon: <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />, label: '左移该列', shortcut: 'Alt+←', onSelect: () => dispatchTable('move-col-left') },
    { icon: <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />, label: '右移该列', shortcut: 'Alt+→', onSelect: () => dispatchTable('move-col-right') },
    { type: 'separator' },
    { icon: <Trash2 className="w-3.5 h-3.5" />, label: '删除行', shortcut: 'Ctrl+Shift+退格', danger: true, onSelect: () => dispatchTable('delete-row') },
    { icon: <Trash className="w-3.5 h-3.5" />, label: '删除列', danger: true, onSelect: () => dispatchTable('delete-col') },
    { type: 'separator' },
    { icon: <Copy className="w-3.5 h-3.5 text-purple-400" />, label: '复制表格', onSelect: () => dispatchTable('copy-table') },
    { icon: <Wand2 className="w-3.5 h-3.5 text-amber-400" />, label: '格式化表格源码', onSelect: () => dispatchTable('format-table') },
    { icon: <XCircle className="w-3.5 h-3.5" />, label: '删除整张表格', danger: true, onSelect: () => dispatchTable('delete-table') },
  ];

  const menus: { key: MenuKey; label: string; width?: string; items: MenuEntry[] }[] = [
    {
      key: 'file',
      label: '文件(F)',
      width: 'w-52',
      items: [
        { icon: <FileText className="w-3.5 h-3.5 text-sky-400" />, label: '新建文档', shortcut: 'Ctrl+N', onSelect: props.onNewFile },
        { icon: <FileText className="w-3.5 h-3.5 text-emerald-400" />, label: '打开文件...', shortcut: 'Ctrl+O', onSelect: props.onOpenFile },
        { icon: <FolderOpen className="w-3.5 h-3.5 text-amber-400" />, label: '打开文件夹...', shortcut: 'Ctrl+Shift+O', onSelect: props.onOpenFolder },
        { icon: <Search className="w-3.5 h-3.5 text-purple-400" />, label: '快速打开...', shortcut: 'Ctrl+P', onSelect: props.onQuickOpen },
        { type: 'separator' },
        { icon: <Save className="w-3.5 h-3.5 text-blue-400" />, label: '保存', shortcut: 'Ctrl+S', onSelect: props.onSaveFile },
        { icon: <Save className="w-3.5 h-3.5 text-purple-400" />, label: '另存为...', shortcut: 'Ctrl+Shift+S', onSelect: props.onSaveFileAs },
        { icon: <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />, label: '在资源管理器中显示', onSelect: props.onRevealInExplorer },
      ],
    },
    {
      key: 'edit',
      label: '编辑(E)',
      width: 'w-52',
      items: [
        { label: '撤消 (Undo)', shortcut: 'Ctrl+Z', onSelect: () => document.execCommand('undo') },
        { label: '重做 (Redo)', shortcut: 'Ctrl+Y', onSelect: () => document.execCommand('redo') },
        { type: 'separator' },
        { icon: <Scissors className="w-3.5 h-3.5" />, label: '剪切', shortcut: 'Ctrl+X', onSelect: () => document.execCommand('cut') },
        { icon: <Copy className="w-3.5 h-3.5" />, label: '复制', shortcut: 'Ctrl+C', onSelect: () => document.execCommand('copy') },
        { icon: <Clipboard className="w-3.5 h-3.5" />, label: '粘贴', shortcut: 'Ctrl+V', onSelect: () => document.execCommand('paste') },
        { label: '全选', shortcut: 'Ctrl+A', onSelect: () => dispatchFormat('select-all') },
        { type: 'separator' },
        { icon: <Copy className="w-3.5 h-3.5 text-sky-400" />, label: '复制为 Markdown', onSelect: () => dispatchFormat('copy-markdown') },
        { icon: <Copy className="w-3.5 h-3.5 text-emerald-400" />, label: '复制为纯文本', onSelect: () => dispatchFormat('copy-plain') },
        { icon: <Copy className="w-3.5 h-3.5 text-purple-400" />, label: '复制为 HTML 代码', onSelect: () => dispatchFormat('copy-html') },
        { type: 'separator' },
        { label: '跳转到文首', shortcut: 'Ctrl+Home', onSelect: () => dispatchFormat('jump-top') },
        { label: '跳转到文末', shortcut: 'Ctrl+End', onSelect: () => dispatchFormat('jump-bottom') },
      ],
    },
    {
      key: 'paragraph',
      label: '段落(P)',
      width: 'w-56',
      items: [
        ...HEADING_NAMES.map((name, i) => ({
          label: name,
          shortcut: `Ctrl+${i + 1}`,
          onSelect: () => dispatchHeading(i + 1),
        })),
        { icon: <Type className="w-3.5 h-3.5 text-sky-400" />, label: '段落 (正文)', shortcut: 'Ctrl+0', onSelect: () => dispatchHeading(0) },
        { type: 'separator' },
        { icon: <ArrowUp className="w-3.5 h-3.5 text-amber-400" />, label: '提升标题级别', onSelect: () => dispatchFormat('increase-heading') },
        { icon: <ArrowDown className="w-3.5 h-3.5 text-amber-400" />, label: '降低标题级别', onSelect: () => dispatchFormat('decrease-heading') },
        { type: 'separator' },
        { type: 'submenu-table' },
        { type: 'separator' },
        { icon: <Code className="w-3.5 h-3.5 text-purple-400" />, label: '代码块', shortcut: 'Ctrl+Shift+K', onSelect: () => dispatchFormat('code') },
        { icon: <Sigma className="w-3.5 h-3.5 text-indigo-400" />, label: '公式块', shortcut: 'Ctrl+Shift+M', onSelect: () => dispatchTable('math-block') },
        { icon: <Quote className="w-3.5 h-3.5 text-emerald-400" />, label: '引用段落', shortcut: 'Ctrl+Shift+Q', onSelect: () => dispatchFormat('quote') },
        { icon: <CheckSquare className="w-3.5 h-3.5 text-sky-400" />, label: '任务清单', shortcut: 'Ctrl+Shift+X', onSelect: () => dispatchFormat('check') },
        { icon: <List className="w-3.5 h-3.5 text-zinc-400" />, label: '无序列表', onSelect: () => dispatchFormat('list') },
        { icon: <ListOrdered className="w-3.5 h-3.5 text-zinc-400" />, label: '有序列表', onSelect: () => dispatchFormat('ordered-list') },
        { type: 'separator' },
        { icon: <ListTree className="w-3.5 h-3.5 text-sky-400" />, label: '插入内容目录 ([TOC])', onSelect: () => dispatchFormat('insert-toc') },
        { icon: <FileCode className="w-3.5 h-3.5 text-amber-400" />, label: '插入 YAML Front Matter', onSelect: () => dispatchFormat('insert-yaml', { title: props.currentFileName.replace(/\.md$/, '') }) },
      ],
    },
    {
      key: 'format',
      label: '格式(M)',
      width: 'w-52',
      items: [
        { icon: <Bold className="w-3.5 h-3.5 text-sky-400" />, label: '加粗', shortcut: 'Ctrl+B', className: 'font-medium', onSelect: () => dispatchFormat('bold') },
        { icon: <Italic className="w-3.5 h-3.5 text-emerald-400" />, label: '斜体', shortcut: 'Ctrl+I', className: 'italic', onSelect: () => dispatchFormat('italic') },
        { icon: <Underline className="w-3.5 h-3.5 text-blue-400" />, label: '下划线', shortcut: 'Ctrl+U', className: 'underline', onSelect: () => dispatchFormat('underline') },
        { icon: <Strikethrough className="w-3.5 h-3.5 text-rose-400" />, label: '删除线', shortcut: 'Alt+Shift+5', className: 'line-through', onSelect: () => dispatchFormat('strike') },
        { icon: <Code className="w-3.5 h-3.5 text-purple-400" />, label: '行内代码', shortcut: '`', onSelect: () => dispatchFormat('inline-code') },
        { icon: <Sigma className="w-3.5 h-3.5 text-indigo-400" />, label: '行内公式', shortcut: '$', onSelect: () => dispatchFormat('inline-math') },
        { icon: <Highlighter className="w-3.5 h-3.5 text-amber-400" />, label: '高亮文本', shortcut: '==', onSelect: () => dispatchFormat('highlight') },
        { label: '上标 (X^2^)', shortcut: '^', onSelect: () => dispatchFormat('superscript') },
        { label: '下标 (H~2~O)', shortcut: '~', onSelect: () => dispatchFormat('subscript') },
        { label: 'HTML 注释', shortcut: '<!-- -->', onSelect: () => dispatchFormat('comment') },
        { type: 'separator' },
        { icon: <LinkIcon className="w-3.5 h-3.5 text-sky-400" />, label: '插入超链接', shortcut: 'Ctrl+K', onSelect: () => dispatchFormat('link') },
        { icon: <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />, label: '切换任务状态', onSelect: () => dispatchFormat('toggle-task') },
        { type: 'separator' },
        { icon: <Trash className="w-3.5 h-3.5" />, label: '清除所选样式', danger: true, onSelect: () => dispatchFormat('clear-format') },
      ],
    },
    {
      key: 'view',
      label: '视图(V)',
      width: 'w-60',
      items: [
        { icon: <Eye className="w-3.5 h-3.5 text-sky-400" />, label: '即时渲染模式 (IR)', rightSlot: props.editorMode === 'ir' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: () => props.onSetEditorMode?.('ir') },
        { icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />, label: '所见即所得模式', rightSlot: props.editorMode === 'wysiwyg' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: () => props.onSetEditorMode?.('wysiwyg') },
        { icon: <Code className="w-3.5 h-3.5 text-amber-400" />, label: '源代码模式', shortcut: 'Ctrl+/', rightSlot: props.editorMode === 'source' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: () => props.onSetEditorMode?.(props.editorMode === 'source' ? 'ir' : 'source') },
        { icon: <Columns className="w-3.5 h-3.5 text-indigo-400" />, label: '分屏预览模式', rightSlot: props.editorMode === 'split' ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: () => props.onSetEditorMode?.('split') },
        { type: 'separator' },
        { icon: <ListTree className="w-3.5 h-3.5 text-emerald-400" />, label: '切换大纲视图', shortcut: 'Ctrl+Shift+O', onSelect: props.onOpenOutline },
        { icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />, label: '开发者模式 (DevTools)', shortcut: 'F12', rightSlot: props.isDevToolsOpen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null, onSelect: props.onToggleDevTools },
        { type: 'separator' },
        { icon: <span className={`w-2 h-2 rounded-full ${props.isTypewriterMode ? 'bg-sky-400' : 'bg-zinc-500'}`} />, label: '打字机模式 (垂直居中)', rightSlot: props.isTypewriterMode ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: props.onToggleTypewriterMode },
        { icon: <span className={`w-2 h-2 rounded-full ${props.isFocusMode ? 'bg-emerald-400' : 'bg-zinc-500'}`} />, label: '专注模式 (聚焦当前段落)', rightSlot: props.isFocusMode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null, onSelect: props.onToggleFocusMode },
        { icon: props.isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 text-sky-400" /> : <PinOff className="w-3.5 h-3.5 text-zinc-400" />, label: '保持窗口在最前端', rightSlot: props.isAlwaysOnTop ? <Check className="w-3.5 h-3.5 text-sky-400" /> : null, onSelect: props.onToggleAlwaysOnTop },
        { type: 'separator' },
        { icon: <Presentation className="w-3.5 h-3.5 text-amber-400" />, label: '幻灯片演示模式', shortcut: 'Ctrl+Shift+P', onSelect: props.onToggleSlideMode },
        { icon: <Maximize className="w-3.5 h-3.5 text-purple-400" />, label: '沉浸式禅模式', shortcut: 'F11', onSelect: props.onToggleZenMode },
        { icon: props.theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-400" />, label: '切换昼夜主题', shortcut: 'Ctrl+Shift+L', onSelect: props.onToggleTheme },
      ],
    },
    {
      key: 'export',
      label: '导出(T)',
      width: 'w-52',
      items: [
        { icon: <Download className="w-3.5 h-3.5 text-rose-400" />, label: '导出为 PDF 文档...', onSelect: props.onExportPDF },
        { icon: <Download className="w-3.5 h-3.5 text-sky-400" />, label: '导出为 HTML 网页...', onSelect: props.onExportHTML },
        { icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />, label: '导出为图片 (PNG)...', onSelect: props.onExportImage },
        { type: 'separator' },
        { icon: <FileText className="w-3.5 h-3.5 text-amber-400" />, label: '导出为纯文本 (.txt)...', onSelect: () => props.onExportText('txt') },
        { icon: <FileCode className="w-3.5 h-3.5 text-purple-400" />, label: '导出为 Markdown (.md)...', onSelect: () => props.onExportText('md') },
      ],
    },
    {
      key: 'help',
      label: '帮助(H)',
      width: 'w-56',
      items: [
        { icon: <Keyboard className="w-3.5 h-3.5 text-sky-400" />, label: '快捷键速查手册', shortcut: 'F1', onSelect: props.onShowShortcuts },
        { icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />, label: '更新日志 (Release Notes)', rightSlot: <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono font-semibold">{CURRENT_APP_VERSION}</span>, onSelect: props.onShowReleaseNotes },
        { icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />, label: '开发者模式 (DevTools)', shortcut: 'F12', onSelect: props.onToggleDevTools },
        { type: 'separator' },
        { icon: <Info className="w-3.5 h-3.5 text-emerald-400" />, label: '关于 MarkForge (全免费)', className: 'font-medium', onSelect: props.onShowAbout },
      ],
    },
  ];

  const renderEntry = (entry: MenuEntry, idx: number) => {
    if (entry.type === 'separator') return <DropdownSeparator key={`sep-${idx}`} />;
    if (entry.type === 'submenu-table') {
      return (
        <DropdownSub key="sub-table">
          <DropdownSubTriggerItem icon={<Table className="w-3.5 h-3.5 text-blue-400" />} label="表格工具箱(B)" />
          <DropdownSubContent className="w-56">
            {tableSubmenuItems.map((sub, sIdx) => renderEntry(sub, sIdx))}
          </DropdownSubContent>
        </DropdownSub>
      );
    }
    return (
      <DropdownItem
        key={`${entry.label}-${idx}`}
        icon={entry.icon}
        label={entry.label}
        shortcut={entry.shortcut}
        rightSlot={entry.rightSlot}
        danger={entry.danger}
        className={entry.className}
        onSelect={entry.onSelect}
      />
    );
  };

  return (
    <div data-mf-menubar className="flex items-center gap-0.5 shrink-0">
      {menus.map((menu) => (
        <DropdownRoot
          key={menu.key}
          modal={false}
          open={openMenu === menu.key}
          onOpenChange={(open) => setOpenMenu(open ? menu.key : null)}
        >
          <DropdownTrigger asChild>
            <button
              data-mf-menubar-item={menu.key}
              onMouseEnter={() => { if (openMenu && openMenu !== menu.key) setOpenMenu(menu.key); }}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 outline-none focus:outline-none ${
                openMenu === menu.key
                  ? 'bg-[var(--bg-hover)] text-[var(--text-heading)]'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {menu.label}
            </button>
          </DropdownTrigger>
          <DropdownContent
            className={`${menu.width || 'w-52'} max-h-[85vh] overflow-y-auto`}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onFocusOutside={(e) => {
              if ((e.target as HTMLElement)?.closest?.('[data-mf-menubar]')) {
                e.preventDefault();
              }
            }}
            onPointerDownOutside={(e) => {
              const hitItem = (e.target as HTMLElement)?.closest?.('[data-mf-menubar-item]');
              if (hitItem && hitItem.getAttribute('data-mf-menubar-item') !== menu.key) {
                e.preventDefault();
              }
            }}
          >
            {menu.items.map((item, idx) => renderEntry(item, idx))}
          </DropdownContent>
        </DropdownRoot>
      ))}
    </div>
  );
};
