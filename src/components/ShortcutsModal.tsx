/**
 * @file src/components/ShortcutsModal.tsx
 * @description 全局快捷键速查手册弹窗，支持按动作、快捷键或功能描述实时过滤检索
 * @module 模态弹窗模块
 */
import React, { useState } from 'react';
import { Keyboard, Search } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Kbd } from './ui/Kbd';
import { CloseButton } from './ui/CloseButton';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  action: string;
  shortcut: string;
  category: '文件与文档' | '段落与格式' | '表格排版' | '视图与演示';
  description: string;
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  { action: '快速保存', shortcut: 'Ctrl + S', category: '文件与文档', description: '立即将修改保存至本地磁盘' },
  { action: '另存为', shortcut: 'Ctrl + Shift + S', category: '文件与文档', description: '选择路径保存新副本' },
  { action: '新建文档', shortcut: 'Ctrl + N', category: '文件与文档', description: '打开新选项卡（或双击标签栏空白）' },
  { action: '关闭当前文档', shortcut: 'Ctrl + W', category: '文件与文档', description: '关闭当前标签（或鼠标中键点击标签）' },
  { action: '打开文件', shortcut: 'Ctrl + O', category: '文件与文档', description: '打开本地单个 Markdown 或纯文本' },
  { action: '打开文件夹', shortcut: 'Ctrl + Shift + O', category: '文件与文档', description: '加载项目文件夹知识库' },
  { action: '快速打开文档', shortcut: 'Ctrl + P', category: '文件与文档', description: '弹窗模糊搜索工作区文档快速打开' },
  { action: '页内全局查找', shortcut: 'Ctrl + F', category: '文件与文档', description: '聚焦右侧正文时呼出页内高亮查找浮层（侧栏聚焦时打开侧栏检索）' },
  { action: '查找并替换', shortcut: 'Ctrl + H', category: '文件与文档', description: '打开右侧编辑区全局查找与批量替换浮层' },

  { action: '一级~六级标题', shortcut: 'Ctrl + 1 ~ 6', category: '段落与格式', description: '原位转换所选段落为对应级别标题' },
  { action: '恢复普通正文', shortcut: 'Ctrl + 0', category: '段落与格式', description: '将当前段落重置为普通文本' },
  { action: '加粗文本', shortcut: 'Ctrl + B', category: '段落与格式', description: '插入或包裹 **粗体**' },
  { action: '斜体文本', shortcut: 'Ctrl + I', category: '段落与格式', description: '插入或包裹 *斜体*' },
  { action: '下划线文本', shortcut: 'Ctrl + U', category: '段落与格式', description: '插入 <u>下划线</u> 标签' },
  { action: '删除线文本', shortcut: 'Alt + Shift + 5', category: '段落与格式', description: '插入或包裹 ~~删除线~~' },
  { action: '插入超链接', shortcut: 'Ctrl + K', category: '段落与格式', description: '插入 [文本](URL) 链接' },
  { action: '代码块', shortcut: 'Ctrl + Shift + K', category: '段落与格式', description: '插入语法高亮代码块' },
  { action: '数学公式块', shortcut: 'Ctrl + Shift + M', category: '段落与格式', description: '插入独立 LaTeX 公式块' },
  { action: '引用语法块', shortcut: 'Ctrl + Shift + Q', category: '段落与格式', description: '插入 > 引用段落' },
  { action: '任务清单', shortcut: 'Ctrl + Shift + X', category: '段落与格式', description: '插入待办清单 - [ ]' },

  { action: '插入/管理表格', shortcut: 'Ctrl + T', category: '表格排版', description: '唤起 10x10 网格滑选器或表格工具箱' },
  { action: '下方插入新行', shortcut: 'Ctrl + Enter', category: '表格排版', description: '在当前单元格所在行下方插入新行' },
  { action: '删除当前行', shortcut: 'Ctrl + Shift + 退格', category: '表格排版', description: '极速删除当前光标所在行' },
  { action: '上移 / 下移行', shortcut: 'Alt + ↑ / ↓', category: '表格排版', description: '表格行原位上下位移调整' },
  { action: '左移 / 右移列', shortcut: 'Alt + ← / →', category: '表格排版', description: '表格列原位左右位移调整' },
  { action: '单元格跳转', shortcut: 'Tab / Shift+Tab', category: '表格排版', description: '顺序移动到下一格，末格自动加行' },

  { action: '源码模式秒切', shortcut: 'Ctrl + /', category: '视图与演示', description: '富文本编辑与纯源代码模式秒级切换' },
  { action: '开发者工具', shortcut: 'F12', category: '视图与演示', description: '开启/关闭 Chromium 开发者模式调试面板' },
  { action: '折叠/展开侧边栏', shortcut: 'Ctrl + \\', category: '视图与演示', description: '释放 Ctrl+B 给加粗，专属侧栏开关' },
  { action: '大纲导航视图', shortcut: 'Ctrl + Shift + O', category: '视图与演示', description: '快速切换侧边栏至目录大纲树' },
  { action: '昼夜高对比切换', shortcut: 'Ctrl + Shift + L', category: '视图与演示', description: '纸质日间与 13.5:1 深色模式秒切' },
  { action: '幻灯片放映模式', shortcut: 'Ctrl + Shift + P', category: '视图与演示', description: '以 --- 切页进行全屏 PPT 汇报演示' },
  { action: '沉浸式禅模式', shortcut: 'F11', category: '视图与演示', description: '隐藏全套顶栏与侧栏，无干扰专注写作' },
  { action: '退出全屏/演示', shortcut: 'ESC', category: '视图与演示', description: '极速退出禅模式或幻灯片放映' },
];

const CATEGORIES = ['全部', '文件与文档', '段落与格式', '表格排版', '视图与演示'];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  const filtered = SHORTCUTS_DATA.filter(item => {
    const matchCat = selectedCategory === '全部' || item.category === selectedCategory;
    const q = filter.toLowerCase();
    const matchText =
      !q.trim() ||
      item.action.toLowerCase().includes(q) ||
      item.shortcut.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q);
    return matchCat && matchText;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="快捷键速查与操作指南" maxWidthClass="max-w-2xl" className="max-h-[85vh]">
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-canvas)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-heading)]">快捷键速查与操作指南</h2>
            <p className="text-[11px] text-[var(--text-muted)]">键盘盲打极致流畅，告别鼠标打断创作心流</p>
          </div>
        </div>

        <CloseButton onClick={onClose} />
      </div>

      <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === c
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索快捷键..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-full pl-8 pr-3 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500 w-44"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">未匹配到相关快捷键</div>
        ) : (
          filtered.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-hover)] text-xs transition-colors border border-transparent hover:border-[var(--border-subtle)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-[var(--text-primary)] w-28 shrink-0">{item.action}</span>
                <span className="text-[var(--text-muted)] text-[11px] truncate">{item.description}</span>
              </div>
              <Kbd className="py-1 ml-3">{item.shortcut}</Kbd>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--status-bar-bg)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>共 {filtered.length} 项操作</span>
        <button
          onClick={onClose}
          className="px-3.5 py-1 rounded bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs transition-colors shadow-sm"
        >
          完成
        </button>
      </div>
    </Modal>
  );
};
