/**
 * @file src/components/Sidebar.tsx
 * @description 左侧导航停靠栏容器，支持折叠切换与文件树、大纲视图、文档检索三大面板切换
 * @module 侧边栏导航模块
 */
import React, { useState, useCallback } from 'react';
import { FolderTree, Search, ListTree, PanelLeftClose, PanelLeft } from 'lucide-react';
import { FileItem } from '../types/electron';
import { FileTreePanel } from './sidebar/FileTreePanel';
import { OutlinePanel } from './sidebar/OutlinePanel';
import { SearchPanel } from './sidebar/SearchPanel';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  folderPath: string | null;
  fileTree: FileItem[];
  onOpenFile: (path: string, name: string) => void;
  onOpenFolder: () => void;
  onCreateFile: (dirPath: string) => void;
  onCreateFolder: (dirPath: string) => void;
  onDeleteItem: (path: string) => void;
  onRenameItem: (path: string, oldName: string) => void;
  onRefreshFolder: () => void;
  markdownContent: string;
  activeTab?: 'files' | 'outline' | 'search';
  onTabChange?: (tab: 'files' | 'outline' | 'search') => void;
  searchFocusTrigger?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  folderPath,
  fileTree,
  onOpenFile,
  onOpenFolder,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onRenameItem,
  onRefreshFolder,
  markdownContent,
  activeTab: externalTab,
  onTabChange,
  searchFocusTrigger,
}) => {
  const [internalTab, setInternalTab] = useState<'files' | 'outline' | 'search'>('files');
  const currentTab = externalTab !== undefined ? externalTab : internalTab;

  const handleTabClick = (tab: 'files' | 'outline' | 'search') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const getActiveEditorElement = useCallback((): HTMLElement | null => {
    const irReset = document.querySelector<HTMLElement>('.vditor-ir .vditor-reset');
    if (irReset && irReset.clientHeight > 0) return irReset;
    const visible = Array.from(document.querySelectorAll<HTMLElement>('.vditor-reset')).find(
      el => el.clientHeight > 0
    );
    return visible || irReset || document.querySelector<HTMLElement>('.vditor-reset');
  }, []);

  if (!isOpen) {
    return (
      <div className="w-[38px] bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col items-center py-2 gap-3 shrink-0">
        <button
          onClick={onToggle}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="展开侧边栏 (Ctrl+\)"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col h-full shrink-0 select-none">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-2 py-1.5 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTabClick('files')}
            className={`p-1.5 rounded transition-colors ${
              currentTab === 'files' ? 'bg-[var(--bg-hover)] text-sky-600 dark:text-sky-400 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="资源管理器"
          >
            <FolderTree className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleTabClick('outline')}
            className={`p-1.5 rounded transition-colors ${
              currentTab === 'outline' ? 'bg-[var(--bg-hover)] text-sky-600 dark:text-sky-400 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="文档大纲视图 (Ctrl+Shift+O)"
          >
            <ListTree className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleTabClick('search')}
            className={`p-1.5 rounded transition-colors ${
              currentTab === 'search' ? 'bg-[var(--bg-hover)] text-sky-600 dark:text-sky-400 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="文档内容搜索 (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="折叠侧栏 (Ctrl+\)"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {currentTab === 'files' && (
          <FileTreePanel
            folderPath={folderPath}
            fileTree={fileTree}
            onOpenFile={onOpenFile}
            onOpenFolder={onOpenFolder}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteItem={onDeleteItem}
            onRenameItem={onRenameItem}
            onRefreshFolder={onRefreshFolder}
          />
        )}

        {currentTab === 'search' && (
          <SearchPanel
            markdownContent={markdownContent}
            isActive={currentTab === 'search' && isOpen}
            focusTrigger={searchFocusTrigger}
            getActiveEditorElement={getActiveEditorElement}
          />
        )}

        {currentTab === 'outline' && (
          <OutlinePanel
            markdownContent={markdownContent}
            isActive={currentTab === 'outline' && isOpen}
            getActiveEditorElement={getActiveEditorElement}
          />
        )}
      </div>
    </aside>
  );
};
