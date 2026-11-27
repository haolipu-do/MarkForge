/**
 * @file src/hooks/useWorkspace.ts
 * @description 管理本地知识库工作区根目录、文件目录树刷新及新建/重命名/删除文件弹窗交互逻辑
 * @module 工作区与文件树 Hook
 */
import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { FileActionMode } from '../components/FileActionModal';
import { TabItem } from '../components/Tabs';
import { FileItem } from '../types/electron';

interface FileActionState {
  isOpen: boolean;
  mode: FileActionMode;
  targetPath: string;
  defaultName?: string;
  itemType?: 'file' | 'folder';
}

interface UseWorkspaceOptions {
  openFileByPath: (filePath: string) => Promise<void>;
  setTabs: Dispatch<SetStateAction<TabItem[]>>;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

/**
 * Manages workspace folder state, file tree updates, and CRUD file-action modal state.
 */
export function useWorkspace({ openFileByPath, setTabs, setSidebarOpen }: UseWorkspaceOptions) {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileItem[]>([]);
  const [fileActionState, setFileActionState] = useState<FileActionState>({
    isOpen: false,
    mode: 'create-file',
    targetPath: '',
  });

  const handleRefreshFolder = useCallback(async () => {
    if (!folderPath) return;
    const items = await window.electronAPI?.readDir(folderPath);
    if (items) setFileTree(items);
  }, [folderPath]);

  const handleOpenFolder = useCallback(async () => {
    const res = await window.electronAPI?.openFolder();
    if (res) {
      setFolderPath(res.folderPath);
      setFileTree(res.tree);
      setSidebarOpen(true);
    }
  }, [setSidebarOpen]);

  const handleOpenFileFromTree = useCallback(
    async (filePath: string, _fileName?: string) => {
      await openFileByPath(filePath);
    },
    [openFileByPath]
  );

  const handleCreateFileInFolder = useCallback((dirPath: string) => {
    setFileActionState({
      isOpen: true,
      mode: 'create-file',
      targetPath: dirPath || folderPath || '',
      defaultName: '新建文档.md',
      itemType: 'file',
    });
  }, [folderPath]);

  const handleCreateFolderInDir = useCallback((dirPath: string) => {
    setFileActionState({
      isOpen: true,
      mode: 'create-folder',
      targetPath: dirPath || folderPath || '',
      defaultName: '新建文件夹',
      itemType: 'folder',
    });
  }, [folderPath]);

  const handleDeleteItem = useCallback((itemPath: string) => {
    const name = itemPath.split(/[/\\]/).pop() || '该项目';
    setFileActionState({
      isOpen: true,
      mode: 'delete',
      targetPath: itemPath,
      defaultName: name,
      itemType: itemPath.endsWith('.md') ? 'file' : 'folder',
    });
  }, []);

  const handleRenameItem = useCallback((oldPath: string, oldName: string) => {
    setFileActionState({
      isOpen: true,
      mode: 'rename',
      targetPath: oldPath,
      defaultName: oldName,
      itemType: oldName.endsWith('.md') ? 'file' : 'folder',
    });
  }, []);

  const handleFileActionConfirm = useCallback(async (name: string) => {
    const { mode, targetPath } = fileActionState;
    setFileActionState(prev => ({ ...prev, isOpen: false }));

    try {
      const sanitized = name.replace(/[\\/:*?"<>|]/g, '_');
      if (mode === 'create-file') {
        const res = await window.electronAPI?.createFile(targetPath, sanitized);
        if (res) {
          await handleOpenFileFromTree(res.path, res.name);
          await handleRefreshFolder();
        }
      } else if (mode === 'create-folder') {
        await window.electronAPI?.createDirectory(targetPath, sanitized);
        await handleRefreshFolder();
      } else if (mode === 'rename') {
        const newPath = await window.electronAPI?.renameItem(targetPath, sanitized);
        if (newPath) {
          setTabs(prev =>
            prev.map(t => (t.path === targetPath ? { ...t, path: newPath, name: sanitized } : t))
          );
          await handleRefreshFolder();
        }
      } else if (mode === 'delete') {
        await window.electronAPI?.deleteItem(targetPath);
        setTabs(prev => prev.filter(t => t.path !== targetPath));
        await handleRefreshFolder();
      }
    } catch (err) {
      console.error('File action failed:', err);
    }
  }, [fileActionState, handleOpenFileFromTree, handleRefreshFolder, setTabs]);

  const closeFileActionModal = useCallback(() => {
    setFileActionState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    folderPath,
    fileTree,
    fileActionState,
    closeFileActionModal,
    handleRefreshFolder,
    handleOpenFolder,
    handleOpenFileFromTree,
    handleCreateFileInFolder,
    handleCreateFolderInDir,
    handleDeleteItem,
    handleRenameItem,
    handleFileActionConfirm,
  };
}
