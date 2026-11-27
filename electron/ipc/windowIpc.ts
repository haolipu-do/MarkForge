/**
 * @file electron/ipc/windowIpc.ts
 * @description 注册窗口控制相关 IPC 处理器（最小化、最大化、关闭拦截、置顶状态与开发者工具开关）
 * @module Electron IPC 通信层
 */
import { BrowserWindow, ipcMain } from 'electron';

export function registerWindowIpc(
  getMainWindow: () => BrowserWindow | null,
  setForceClosing: (val: boolean) => void
) {
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    win?.minimize();
  });

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    win?.close();
  });

  ipcMain.handle('window:force-close', () => {
    setForceClosing(true);
    getMainWindow()?.close();
  });

  ipcMain.handle('window:isMaximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    return win?.isMaximized() ?? false;
  });

  ipcMain.handle('window:setAlwaysOnTop', (event, flag?: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return false;
    const current = win.isAlwaysOnTop();
    const next = flag !== undefined ? flag : !current;
    win.setAlwaysOnTop(next);
    return next;
  });

  ipcMain.handle('window:isAlwaysOnTop', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    return win?.isAlwaysOnTop() ?? false;
  });

  ipcMain.handle('window:toggleDevTools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return false;
    const wasOpened = win.webContents.isDevToolsOpened();
    if (wasOpened) {
      win.webContents.closeDevTools();
      return false;
    }
    win.webContents.openDevTools({ mode: 'right' });
    return true;
  });

  ipcMain.handle('window:isDevToolsOpened', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    return win?.webContents.isDevToolsOpened() ?? false;
  });
}
