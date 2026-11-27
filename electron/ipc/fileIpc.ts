/**
 * @file electron/ipc/fileIpc.ts
 * @description 注册文件系统与目录树 IPC 处理器（打开文件/文件夹、读写、新建、重命名、删除及资源管理器定位）
 * @module Electron IPC 通信层
 */
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

export function scanDirectory(dir: string, depth = 0, maxDepth = 3): FileItem[] {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items: FileItem[] = [];
    const ignored = new Set(['node_modules', '.git', '.vscode', 'dist', 'dist-electron', 'release']);

    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const item: FileItem = {
          name: entry.name,
          path: fullPath,
          isDirectory: true,
        };
        if (depth < maxDepth) {
          item.children = scanDirectory(fullPath, depth + 1, maxDepth);
        }
        items.push(item);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.markdown', '.txt', '.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
          items.push({
            name: entry.name,
            path: fullPath,
            isDirectory: false,
          });
        }
      }
    }

    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error('Failed to read dir:', dir, err);
    return [];
  }
}

export function registerFileIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('file:open', async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '打开 Markdown 文件',
      properties: ['openFile'],
      filters: [
        { name: 'Markdown 文档', extensions: ['md', 'markdown', 'txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const name = path.basename(filePath);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { path: filePath, name, content };
  });

  ipcMain.handle('folder:open', async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '打开知识库文件夹',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const folderPath = result.filePaths[0];
    return { folderPath, tree: scanDirectory(folderPath) };
  });

  ipcMain.handle('folder:read', async (_event, dirPath: string) => scanDirectory(dirPath));
  ipcMain.handle('file:read', async (_event, filePath: string) => fs.promises.readFile(filePath, 'utf-8'));

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  });

  ipcMain.handle('file:saveAs', async (_event, defaultName: string, content: string) => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      title: '另存为 Markdown 文件',
      defaultPath: defaultName || 'Untitled.md',
      filters: [
        { name: 'Markdown 文件', extensions: ['md'] },
        { name: '文本文件', extensions: ['txt'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;

    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return { path: result.filePath, name: path.basename(result.filePath) };
  });

  ipcMain.handle('file:create', async (_event, dirPath: string, fileName: string) => {
    const targetName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    const targetPath = path.join(dirPath, targetName);
    await fs.promises.writeFile(targetPath, `# ${fileName.replace(/\.md$/, '')}\n\n`, 'utf-8');
    return { path: targetPath, name: targetName };
  });

  ipcMain.handle('folder:create', async (_event, dirPath: string, folderName: string) => {
    const targetPath = path.join(dirPath, folderName);
    await fs.promises.mkdir(targetPath, { recursive: true });
    return targetPath;
  });

  ipcMain.handle('item:delete', async (_event, itemPath: string) => {
    try {
      await shell.trashItem(itemPath);
      return true;
    } catch {
      await fs.promises.rm(itemPath, { recursive: true, force: true });
      return true;
    }
  });

  ipcMain.handle('item:rename', async (_event, oldPath: string, newName: string) => {
    const newPath = path.join(path.dirname(oldPath), newName);
    await fs.promises.rename(oldPath, newPath);
    return newPath;
  });

  ipcMain.handle('system:showItem', (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    try {
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
        await shell.openExternal(url);
        return true;
      }
    } catch (err) {
      console.error('Failed to open external URL:', err);
    }
    return false;
  });
}
