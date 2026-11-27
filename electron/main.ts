/**
 * @file electron/main.ts
 * @description Electron 主进程入口，负责窗口生命周期管理、单实例与冷启动文件打开、Windows 文件关联注册及 IPC 模块挂载
 * @module Electron 主进程核心
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { registerWindowIpc } from './ipc/windowIpc';
import { registerFileIpc } from './ipc/fileIpc';
import { registerExportIpc } from './ipc/exportIpc';
import { registerInstallerIpc } from './ipc/installerIpc';

let mainWindow: BrowserWindow | null = null;
let isForceClosing = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const portableExeName = process.env.PORTABLE_EXECUTABLE_FILE
  ? path.basename(process.env.PORTABLE_EXECUTABLE_FILE).toLowerCase()
  : '';

const isInstallerMode =
  process.argv.includes('--installer') ||
  path.basename(process.execPath).toLowerCase().includes('setup') ||
  path.basename(process.execPath).toLowerCase().includes('installer') ||
  portableExeName.includes('setup') ||
  portableExeName.includes('installer') ||
  portableExeName.includes('安装') ||
  process.env.MARKFORGE_INSTALLER === 'true';

function extractFilePathFromArgv(argv: string[]): string | null {
  const args = argv.slice(app.isPackaged ? 1 : 2);
  for (const arg of args) {
    if (!arg.startsWith('-') && !arg.startsWith('--')) {
      try {
        const resolved = path.resolve(arg.replace(/^["']|["']$/g, ''));
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          return resolved;
        }
      } catch {}
    }
  }
  return null;
}

let fileToOpenOnStartup: string | null = extractFilePathFromArgv(process.argv);

if (!isInstallerMode) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (_event, commandLine) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        const filePath = extractFilePathFromArgv(commandLine);
        if (filePath) mainWindow.webContents.send('file:opened-from-system', filePath);
      }
    });
  }
}

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  fileToOpenOnStartup = filePath;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('file:opened-from-system', filePath);
  }
});

function registerWindowsOpenWith() {
  if (process.platform !== 'win32' || isDev || isInstallerMode) return;
  try {
    const currentExe = process.execPath;
    const ps = `
$appKey = 'HKCU:\\Software\\Classes\\Applications\\MarkForge.exe';
if (-not (Test-Path $appKey)) { New-Item -Path $appKey -Force | Out-Null };
Set-ItemProperty -Path $appKey -Name 'FriendlyAppName' -Value 'MarkForge';

$cmdKey = Join-Path $appKey 'shell\\open\\command';
if (-not (Test-Path $cmdKey)) { New-Item -Path $cmdKey -Force | Out-Null };
Set-ItemProperty -Path $cmdKey -Name '(Default)' -Value ('"' + '${currentExe.replace(/'/g, "''")}' + '" "%1"');

$supKey = Join-Path $appKey 'SupportedTypes';
if (-not (Test-Path $supKey)) { New-Item -Path $supKey -Force | Out-Null };
Set-ItemProperty -Path $supKey -Name '.md' -Value '';
Set-ItemProperty -Path $supKey -Name '.markdown' -Value '';

$mui = 'HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache';
if (Test-Path $mui) {
  Set-ItemProperty -Path $mui -Name ('${currentExe.replace(/'/g, "''")}' + '.FriendlyAppName') -Value 'MarkForge' -ErrorAction SilentlyContinue;
  Set-ItemProperty -Path $mui -Name ('${currentExe.replace(/'/g, "''")}' + '.ApplicationCompany') -Value 'MarkForge Team' -ErrorAction SilentlyContinue;
}
`;
    execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${ps.replace(/\r?\n/g, ' ')}"`);
  } catch (err) {
    console.warn('registerWindowsOpenWith warning:', err);
  }
}

function attachSharedWebContentsHandlers(win: BrowserWindow) {
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'right' });
      }
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  win.webContents.on('devtools-opened', () => {
    win.webContents.send('window:devtools-changed', true);
  });

  win.webContents.on('devtools-closed', () => {
    win.webContents.send('window:devtools-changed', false);
  });

  win.on('closed', () => {
    mainWindow = null;
  });
}

function createInstallerWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 500,
    useContentSize: true,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#installer`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'installer' });
  }

  attachSharedWebContentsHandlers(mainWindow);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#18181B',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.once('did-finish-load', () => {
    if (fileToOpenOnStartup && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('file:opened-from-system', fileToOpenOnStartup);
    }
  });

  mainWindow.on('close', (e) => {
    if (isForceClosing) return;
    e.preventDefault();
    mainWindow?.webContents.send('window:try-close');
  });

  attachSharedWebContentsHandlers(mainWindow);
}

ipcMain.handle('app:getInitialFile', () => {
  const file = fileToOpenOnStartup;
  fileToOpenOnStartup = null;
  return file;
});

registerWindowIpc(() => mainWindow, (val) => { isForceClosing = val; });
registerFileIpc(() => mainWindow);
registerExportIpc(() => mainWindow);
registerInstallerIpc(isInstallerMode, () => mainWindow, (val) => { isForceClosing = val; }, createWindow);

app.whenReady().then(() => {
  registerWindowsOpenWith();
  if (isInstallerMode) {
    createInstallerWindow();
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isInstallerMode) createInstallerWindow();
      else createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
