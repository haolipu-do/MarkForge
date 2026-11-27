/**
 * @file src/components/Header.tsx
 * @description 顶部无边框应用标题栏，组合品牌 Logo、主菜单栏、面包屑文件名展示、模式快捷开关与窗口控制按钮
 * @module 顶部导航与窗口栏
 */
import React, { useState, useEffect } from 'react';
import { Sun, Moon, Presentation, Maximize, Minimize2, ChevronRight } from 'lucide-react';
import type { EditorMode } from './Editor';
import { HeaderMenuBar, MenuKey } from './header/HeaderMenuBar';
import { WindowControls } from './header/WindowControls';

interface HeaderProps {
  currentFileName: string;
  isDirty: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
  isSlideMode: boolean;
  onToggleSlideMode: () => void;
  isTypewriterMode: boolean;
  onToggleTypewriterMode: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  isAlwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onQuickOpen: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
  onExportImage: () => void;
  onExportText: (ext: string) => void;
  onRevealInExplorer: () => void;
  onOpenOutline: () => void;
  onShowShortcuts: () => void;
  onShowReleaseNotes: () => void;
  onShowAbout: () => void;
  onCloseApp?: () => void;
  editorMode?: EditorMode;
  onSetEditorMode?: (mode: EditorMode) => void;
  isDevToolsOpen?: boolean;
  onToggleDevTools?: () => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const {
    currentFileName,
    isDirty,
    theme,
    onToggleTheme,
    isZenMode,
    onToggleZenMode,
    isSlideMode,
    onToggleSlideMode,
    onShowAbout,
    onCloseApp,
    editorMode = 'ir',
    isDevToolsOpen = false,
  } = props;

  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const checkMaximized = async () => {
    try {
      const max = await window.electronAPI?.isMaximized();
      if (typeof max === 'boolean') setIsMaximized(max);
    } catch {}
  };

  useEffect(() => {
    checkMaximized();
    window.addEventListener('resize', checkMaximized);
    return () => window.removeEventListener('resize', checkMaximized);
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.minimize();
  };

  const handleMaximize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.electronAPI?.maximize();
    setTimeout(checkMaximized, 100);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCloseApp) onCloseApp();
    else window.electronAPI?.close();
  };

  return (
    <header
      onDoubleClick={() => handleMaximize()}
      className="titlebar-drag select-none h-[42px] bg-[var(--bg-header)] border-b border-[var(--border-subtle)] flex items-center justify-between pl-3 pr-0 text-sm z-50 shrink-0"
    >
      {/* Left: Brand & Data-Driven Radix Dropdown Menus */}
      <div className="titlebar-no-drag flex items-center gap-0.5 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div
          onClick={onShowAbout}
          className="flex items-center gap-1.5 font-bold text-base text-[var(--text-heading)] mr-1.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
          title="点击查看 MarkForge 墨拓关于信息"
        >
          <div className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
            M
          </div>
          <span className="tracking-tight text-sm font-semibold hidden lg:inline shrink-0">MarkForge</span>
        </div>

        <HeaderMenuBar
          {...props}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          editorMode={editorMode}
          isDevToolsOpen={isDevToolsOpen}
        />
      </div>

      {/* Middle: Breadcrumb & Active Document */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] min-w-0 flex-1 justify-center px-2 overflow-hidden">
        <span className="hidden xl:inline shrink-0 text-zinc-500">知识库</span>
        <ChevronRight className="w-3 h-3 hidden xl:inline shrink-0 text-zinc-600" />
        <span className="text-[var(--text-primary)] font-medium truncate min-w-0 text-center max-w-[280px]">
          {currentFileName}
          {isDirty && <span className="ml-1 text-sky-400 font-bold">●</span>}
        </span>
      </div>

      {/* Right: Feature Toggles & Window Controls */}
      <div className="titlebar-no-drag flex items-center gap-1 h-full shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onToggleSlideMode}
          title={isSlideMode ? '退出幻灯片模式 (Esc 或 Ctrl+Shift+P)' : '开启 Slide 幻灯片演示模式 (Ctrl+Shift+P)'}
          className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isSlideMode
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Presentation className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">幻灯片</span>
        </button>

        <button
          onClick={onToggleZenMode}
          title={isZenMode ? '退出禅模式 (F11 或 Esc)' : '进入沉浸式禅模式 (F11)'}
          className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isZenMode
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {isZenMode ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden xl:inline">禅模式</span>
        </button>

        <div
          onClick={onToggleTheme}
          title={theme === 'dark' ? '切换为日间模式 (Ctrl+Shift+L)' : '切换为高清晰度深色模式 (Ctrl+Shift+L)'}
          className={`theme-switch ${theme === 'dark' ? 'dark' : ''} ml-1 cursor-pointer shrink-0`}
        >
          <div className="theme-switch-thumb">
            {theme === 'dark' ? <Moon className="w-3 h-3 text-sky-400" /> : <Sun className="w-3 h-3 text-amber-500" />}
          </div>
        </div>

        <WindowControls
          isMaximized={isMaximized}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
        />
      </div>
    </header>
  );
};
