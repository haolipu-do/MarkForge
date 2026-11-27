/**
 * @file src/types/electron.d.ts
 * @description 渲染进程共享的 ElectronAPI、文件树节点 FileItem 及 Window 全局对象类型声明
 * @module 类型定义模块
 */
export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  forceClose?: () => Promise<void>;
  onTryClose?: (callback: () => void) => () => void;
  isMaximized: () => Promise<boolean>;
  setAlwaysOnTop: (flag?: boolean) => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;
  toggleDevTools?: () => Promise<boolean>;
  isDevToolsOpened?: () => Promise<boolean>;
  onDevToolsChanged?: (callback: (isOpen: boolean) => void) => () => void;

  openFile: () => Promise<{ path: string; name: string; content: string } | null>;
  openFolder: () => Promise<{ folderPath: string; tree: FileItem[] } | null>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  saveFileAs: (defaultName: string, content: string) => Promise<{ path: string; name: string } | null>;
  createFile: (dirPath: string, fileName: string) => Promise<{ path: string; name: string } | null>;
  createDirectory: (dirPath: string, folderName: string) => Promise<string | null>;
  deleteItem: (itemPath: string) => Promise<boolean>;
  renameItem: (oldPath: string, newName: string) => Promise<string | null>;
  readDir: (dirPath: string) => Promise<FileItem[]>;

  exportPDF: (title: string) => Promise<string | null>;
  exportHTML: (title: string, htmlContent: string) => Promise<string | null>;
  exportImage: (title: string) => Promise<string | null>;
  exportText: (title: string, content: string, ext?: string) => Promise<string | null>;

  // System
  showItemInFolder: (filePath: string) => void;
  openExternal: (url: string) => Promise<boolean>;
  getInitialFile: () => Promise<string | null>;
  onFileOpenedFromSystem: (callback: (filePath: string) => void) => () => void;

  // Installer
  installer?: {
    isInstallerMode: () => Promise<boolean>;
    getDefaultPath: () => Promise<string>;
    checkInstalled: (targetPath?: string) => Promise<{ isInstalled: boolean; path: string }>;
    selectDirectory: () => Promise<string | null>;
    startInstall: (options: { targetDir: string; createDesktopShortcut: boolean }) => Promise<{ success: boolean; error?: string }>;
    onProgress: (callback: (data: { percent: number; message: string }) => void) => () => void;
    launchApp: (targetDir?: string) => Promise<void>;
    minimize: () => void;
    close: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
