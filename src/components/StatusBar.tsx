/**
 * @file src/components/StatusBar.tsx
 * @description 底部状态栏组件，显示词数/字符数/阅读时长、保存状态、源码模式与开发者工具开关及大纲快捷入口
 * @module 底部状态栏模块
 */
import React from 'react';
import { AlignLeft, Clock, Code2, CheckCircle, ListTree, Pin, Terminal } from 'lucide-react';
import type { EditorMode } from './Editor';

interface StatusBarProps {
  stats: {
    words: number;
    chars: number;
    readTime: number;
  };
  isSaved: boolean;
  lineEnding?: 'CRLF' | 'LF';
  onToggleLineEnding?: () => void;
  isTypewriterMode?: boolean;
  isFocusMode?: boolean;
  isAlwaysOnTop?: boolean;
  onOpenOutline?: () => void;
  editorMode?: EditorMode;
  onToggleSourceMode?: () => void;
  isDevToolsOpen?: boolean;
  onToggleDevTools?: () => void;
}

const MODE_LABEL_MAP: Record<EditorMode, string> = {
  ir: 'Markdown (即时渲染)',
  wysiwyg: '所见即所得',
  source: '源代码模式',
  split: '分屏预览',
};

export const StatusBar: React.FC<StatusBarProps> = ({
  stats,
  isSaved,
  lineEnding = 'CRLF',
  onToggleLineEnding,
  isTypewriterMode,
  isFocusMode,
  isAlwaysOnTop,
  onOpenOutline,
  editorMode = 'wysiwyg',
  onToggleSourceMode,
  isDevToolsOpen = false,
  onToggleDevTools,
}) => {
  const isSourceActive = editorMode === 'source';

  return (
    <footer className="h-6 bg-[var(--status-bar-bg)] border-t border-[var(--border-subtle)] flex items-center justify-between px-3 text-[11px] text-[var(--text-muted)] select-none shrink-0">
      {/* Left status & mode indicators (Typora-inspired </> Source toggle & DevTools trigger) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSourceMode}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer font-medium ${
            isSourceActive
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)] hover:text-sky-400'
          }`}
          title={isSourceActive ? '退出源代码模式，返回富文本编辑 (Ctrl+/)' : '启用源代码模式 (Ctrl+/)'}
        >
          <Code2 className={`w-3.5 h-3.5 ${isSourceActive ? 'text-sky-400' : 'text-sky-400'}`} />
          <span>{MODE_LABEL_MAP[editorMode] || 'Markdown (GFM)'}</span>
        </button>
        <button
          onClick={onToggleDevTools}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
            isDevToolsOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-medium'
              : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-emerald-400'
          }`}
          title={isDevToolsOpen ? '关闭开发者模式 DevTools (F12)' : '打开开发者模式 DevTools (F12)'}
        >
          <Terminal className="w-3 h-3" />
          <span>开发者模式</span>
        </button>
        <span>•</span>
        <button
          onClick={onOpenOutline}
          className="flex items-center gap-1 hover:text-sky-400 cursor-pointer transition-colors"
          title="点击打开侧边栏大纲树 (Ctrl+Shift+O)"
        >
          <ListTree className="w-3 h-3 text-emerald-400" />
          <span>大纲</span>
        </button>
        <span>•</span>
        <span>UTF-8</span>
        <span>•</span>
        <button
          onClick={onToggleLineEnding}
          className="hover:text-sky-400 cursor-pointer font-mono font-medium transition-colors"
          title="点击切换换行符格式 (CRLF / LF)"
        >
          {lineEnding}
        </button>
        <span>•</span>
        <div className="flex items-center gap-1">
          <CheckCircle className={`w-3 h-3 ${isSaved ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{isSaved ? '已保存至本地' : '未保存变更'}</span>
        </div>

        {/* Creative Mode Badges */}
        {(isTypewriterMode || isFocusMode || isAlwaysOnTop) && (
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            {isTypewriterMode && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                打字机
              </span>
            )}
            {isFocusMode && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                专注
              </span>
            )}
            {isAlwaysOnTop && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                <Pin className="w-2.5 h-2.5" />
                置顶
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right statistics */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          <AlignLeft className="w-3 h-3" />
          <span>{stats.words} 词</span>
        </div>
        <span>•</span>
        <span>{stats.chars} 字符</span>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>阅读约 {stats.readTime} 分钟</span>
        </div>
        <span>•</span>
        <span className="text-zinc-400 font-mono text-[10px]">100%</span>
      </div>
    </footer>
  );
};
