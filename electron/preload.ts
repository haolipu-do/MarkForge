/**
 * @file electron/preload.ts
 * @description Electron 预加载脚本，通过 contextBridge 安全向渲染进程暴露 window.electronAPI 原生能力接口
 * @module Electron 主进程核心
 */
import { contextBridge, ipcRenderer } from 'electron';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface ElectronAPI {
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  forceClose: () => Promise<void>;
  onTryClose: (callback: () => void) => () => void;
  isMaximized: () => Promise<boolean>;
  setAlwaysOnTop: (flag?: boolean) => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;
  toggleDevTools: () => Promise<boolean>;
  isDevToolsOpened: () => Promise<boolean>;
  onDevToolsChanged: (callback: (isOpen: boolean) => void) => () => void;

  // Dialogs & Files
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

  // Export
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

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  forceClose: () => ipcRenderer.invoke('window:force-close'),
  onTryClose: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('window:try-close', listener);
    return () => {
      ipcRenderer.removeListener('window:try-close', listener);
    };
  },
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setAlwaysOnTop: (flag?: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', flag),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),
  toggleDevTools: () => ipcRenderer.invoke('window:toggleDevTools'),
  isDevToolsOpened: () => ipcRenderer.invoke('window:isDevToolsOpened'),
  onDevToolsChanged: (callback: (isOpen: boolean) => void) => {
    const listener = (_event: any, isOpen: boolean) => callback(isOpen);
    ipcRenderer.on('window:devtools-changed', listener);
    return () => {
      ipcRenderer.removeListener('window:devtools-changed', listener);
    };
  },

  openFile: () => ipcRenderer.invoke('file:open'),
  openFolder: () => ipcRenderer.invoke('folder:open'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  saveFileAs: (defaultName: string, content: string) => ipcRenderer.invoke('file:saveAs', defaultName, content),
  createFile: (dirPath: string, fileName: string) => ipcRenderer.invoke('file:create', dirPath, fileName),
  createDirectory: (dirPath: string, folderName: string) => ipcRenderer.invoke('folder:create', dirPath, folderName),
  deleteItem: (itemPath: string) => ipcRenderer.invoke('item:delete', itemPath),
  renameItem: (oldPath: string, newName: string) => ipcRenderer.invoke('item:rename', oldPath, newName),
  readDir: (dirPath: string) => ipcRenderer.invoke('folder:read', dirPath),

  exportPDF: (title: string) => ipcRenderer.invoke('export:pdf', title),
  exportHTML: (title: string, htmlContent: string) => ipcRenderer.invoke('export:html', title, htmlContent),
  exportImage: (title: string) => ipcRenderer.invoke('export:image', title),
  exportText: (title: string, content: string, ext?: string) => ipcRenderer.invoke('export:text', title, content, ext),

  showItemInFolder: (filePath: string) => ipcRenderer.invoke('system:showItem', filePath),
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  onFileOpenedFromSystem: (callback: (filePath: string) => void) => {
    const listener = (_event: any, filePath: string) => callback(filePath);
    ipcRenderer.on('file:opened-from-system', listener);
    return () => {
      ipcRenderer.removeListener('file:opened-from-system', listener);
    };
  },

  installer: {
    isInstallerMode: () => ipcRenderer.invoke('installer:isInstallerMode'),
    getDefaultPath: () => ipcRenderer.invoke('installer:getDefaultPath'),
    checkInstalled: (targetPath?: string) => ipcRenderer.invoke('installer:checkInstalled', targetPath),
    selectDirectory: () => ipcRenderer.invoke('installer:selectDirectory'),
    startInstall: (options: { targetDir: string; createDesktopShortcut: boolean }) =>
      ipcRenderer.invoke('installer:startInstall', options),
    onProgress: (callback: (data: { percent: number; message: string }) => void) => {
      const listener = (_event: any, data: { percent: number; message: string }) => callback(data);
      ipcRenderer.on('installer:progress', listener);
      return () => {
        ipcRenderer.removeListener('installer:progress', listener);
      };
    },
    launchApp: (targetDir?: string) => ipcRenderer.invoke('installer:launchApp', targetDir),
    minimize: () => ipcRenderer.invoke('installer:minimize'),
    close: () => ipcRenderer.invoke('installer:close'),
  },
});
