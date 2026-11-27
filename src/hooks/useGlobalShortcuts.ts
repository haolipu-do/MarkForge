/**
 * @file src/hooks/useGlobalShortcuts.ts
 * @description 注册窗口级全局快捷键监听（保存、新建/关闭标签、快速打开、查找替换、禅模式与幻灯片切换等）
 * @module 全局快捷键 Hook
 */
import { useEffect, Dispatch, SetStateAction } from 'react';

interface UseGlobalShortcutsOptions {
  activeTabId: string;
  isSlideMode: boolean;
  setIsSlideMode: Dispatch<SetStateAction<boolean>>;
  isZenMode: boolean;
  setIsZenMode: Dispatch<SetStateAction<boolean>>;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setSidebarTab: Dispatch<SetStateAction<'files' | 'outline' | 'search'>>;
  setSearchFocusTrigger: Dispatch<SetStateAction<number>>;
  setIsQuickOpen: Dispatch<SetStateAction<boolean>>;
  setIsShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
  onToggleTheme: () => void;
  onOpenOutline: () => void;
  onToggleAlwaysOnTop: () => void;
}

/**
 * Registers global window-level keyboard shortcuts across tabs, modals, search, and view modes.
 */
export function useGlobalShortcuts({
  activeTabId,
  isSlideMode,
  setIsSlideMode,
  isZenMode,
  setIsZenMode,
  setSidebarOpen,
  setSidebarTab,
  setSearchFocusTrigger,
  setIsQuickOpen,
  setIsShortcutsOpen,
  onSaveFile,
  onSaveFileAs,
  onOpenFile,
  onOpenFolder,
  onNewTab,
  onCloseTab,
  onToggleTheme,
  onOpenOutline,
  onToggleAlwaysOnTop,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const lower = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (isSlideMode) {
          e.preventDefault();
          setIsSlideMode(false);
          return;
        }
        if (isZenMode) {
          e.preventDefault();
          setIsZenMode(false);
          return;
        }
      } else if (mod && !e.shiftKey && lower === 's') {
        e.preventDefault();
        onSaveFile();
      } else if (mod && e.shiftKey && lower === 's') {
        e.preventDefault();
        onSaveFileAs();
      } else if (mod && !e.shiftKey && lower === 'o') {
        e.preventDefault();
        onOpenFile();
      } else if (mod && e.shiftKey && lower === 'o') {
        e.preventDefault();
        onOpenFolder();
      } else if (mod && !e.shiftKey && lower === 'n') {
        e.preventDefault();
        onNewTab();
      } else if (mod && !e.shiftKey && lower === 'w') {
        e.preventDefault();
        if (activeTabId) onCloseTab(activeTabId);
      } else if (mod && e.shiftKey && lower === 'l') {
        e.preventDefault();
        onToggleTheme();
      } else if (mod && e.shiftKey && lower === 'p') {
        e.preventDefault();
        setIsSlideMode(prev => !prev);
      } else if (mod && !e.shiftKey && lower === 'p') {
        e.preventDefault();
        setIsQuickOpen(true);
      } else if (mod && e.shiftKey && lower === 't') {
        e.preventDefault();
        onToggleAlwaysOnTop();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if ((mod && e.key === '\\') || (e.altKey && e.key === '1')) {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      } else if (mod && !e.shiftKey && lower === 'f') {
        e.preventDefault();
        const activeEl = document.activeElement as HTMLElement | null;
        const inSidebar = Boolean(activeEl?.closest('aside')) && !isZenMode;
        if (inSidebar) {
          setSidebarOpen(true);
          setSidebarTab('search');
          setSearchFocusTrigger(Date.now());
        } else {
          const selText = window.getSelection()?.toString().trim() || '';
          window.dispatchEvent(
            new CustomEvent('markforge-editor-find', {
              detail: { query: selText, showReplace: false },
            })
          );
        }
      } else if (mod && e.shiftKey && lower === 'f') {
        e.preventDefault();
        setSidebarOpen(true);
        setSidebarTab('search');
        setSearchFocusTrigger(Date.now());
      } else if (mod && !e.shiftKey && lower === 'h') {
        e.preventDefault();
        const selText = window.getSelection()?.toString().trim() || '';
        window.dispatchEvent(
          new CustomEvent('markforge-editor-find', {
            detail: { query: selText, showReplace: true },
          })
        );
      } else if (e.key === 'F11') {
        e.preventDefault();
        setIsZenMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeTabId,
    isSlideMode,
    isZenMode,
    onSaveFile,
    onSaveFileAs,
    onOpenFile,
    onOpenFolder,
    onNewTab,
    onCloseTab,
    onToggleTheme,
    onOpenOutline,
    onToggleAlwaysOnTop,
    setIsSlideMode,
    setIsZenMode,
    setSidebarOpen,
    setSidebarTab,
    setSearchFocusTrigger,
    setIsQuickOpen,
    setIsShortcutsOpen,
  ]);
}
