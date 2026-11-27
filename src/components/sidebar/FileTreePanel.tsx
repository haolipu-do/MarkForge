/**
 * @file src/components/sidebar/FileTreePanel.tsx
 * @description 工作区递归文件目录树面板，提供文件夹打开、刷新、新建文档/目录、重命名与删除交互
 * @module 侧边栏导航模块
 */
import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit2,
} from 'lucide-react';
import { FileItem } from '../../types/electron';

interface FileTreePanelProps {
  folderPath: string | null;
  fileTree: FileItem[];
  onOpenFile: (path: string, name: string) => void;
  onOpenFolder: () => void;
  onCreateFile: (dirPath: string) => void;
  onCreateFolder: (dirPath: string) => void;
  onDeleteItem: (path: string) => void;
  onRenameItem: (path: string, oldName: string) => void;
  onRefreshFolder: () => void;
}

export const FileTreePanel: React.FC<FileTreePanelProps> = ({
  folderPath,
  fileTree,
  onOpenFile,
  onOpenFolder,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onRenameItem,
  onRefreshFolder,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshFolder();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const renderItem = (item: FileItem, depth = 0) => {
    const isExpanded = !!expandedFolders[item.path];
    const isMd = item.name.endsWith('.md') || item.name.endsWith('.markdown');

    if (item.isDirectory) {
      return (
        <div key={item.path} className="select-none">
          <div
            onClick={() => toggleFolder(item.path)}
            className="group flex items-center justify-between py-1 px-2 rounded hover:bg-[var(--bg-hover)] cursor-pointer text-xs transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-1.5 truncate text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate font-medium">{item.name}</span>
            </div>

            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onCreateFile(item.path); }}
                className="p-0.5 hover:text-sky-400 text-zinc-400 cursor-pointer"
                title="在此文件夹新建文档"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onCreateFolder(item.path); }}
                className="p-0.5 hover:text-amber-400 text-zinc-400 cursor-pointer"
                title="在此新建子文件夹"
              >
                <FolderPlus className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRenameItem(item.path, item.name); }}
                className="p-0.5 hover:text-indigo-400 text-zinc-400 cursor-pointer"
                title="重命名文件夹"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.path); }}
                className="p-0.5 hover:text-rose-400 text-zinc-400 cursor-pointer"
                title="删除文件夹"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {isExpanded && item.children && (
            <div>{item.children.map(child => renderItem(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        onClick={() => onOpenFile(item.path, item.name)}
        className="group flex items-center justify-between py-1 px-2 rounded hover:bg-[var(--bg-hover)] cursor-pointer text-xs transition-colors"
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        <div className="flex items-center gap-1.5 truncate text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isMd ? 'text-sky-400' : 'text-zinc-500'}`} />
          <span className="truncate">{item.name}</span>
        </div>

        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onRenameItem(item.path, item.name); }}
            className="p-0.5 hover:text-amber-400 text-zinc-400"
            title="重命名"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.path); }}
            className="p-0.5 hover:text-rose-400 text-zinc-400"
            title="删除文件"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate max-w-[130px]"
          title={folderPath || '未打开文件夹'}
        >
          {folderPath ? folderPath.split(/[\\/]/).pop() : '未打开文件夹'}
        </span>

        <div className="flex items-center gap-1">
          {folderPath && (
            <>
              <button
                onClick={() => onCreateFile(folderPath)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-sky-400 transition-colors cursor-pointer"
                title="新建 Markdown 文件"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onCreateFolder(folderPath)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-amber-400 transition-colors cursor-pointer"
                title="新建子文件夹"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="刷新目录 (Ctrl+R)"
              >
                <RefreshCw className={`w-3.5 h-3.5 transition-transform ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {folderPath ? (
        <div className="space-y-0.5">
          {fileTree.map(item => renderItem(item, 0))}
        </div>
      ) : (
        <div className="py-8 px-4 text-center">
          <FolderOpen className="w-10 h-10 mx-auto text-zinc-500 mb-2 opacity-60" />
          <p className="text-xs text-[var(--text-muted)] mb-3">暂未打开工作区文件夹</p>
          <button
            onClick={onOpenFolder}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-medium transition-colors shadow-sm w-full"
          >
            打开文件夹
          </button>
        </div>
      )}
    </div>
  );
};
