/**
 * @file electron/ipc/exportIpc.ts
 * @description 注册文档多格式导出 IPC 处理器（PDF 打印导出、主题化 HTML 导出、长图截图导出及纯文本/Markdown 导出）
 * @module Electron IPC 通信层
 */
import { BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'fs';

export function registerExportIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('export:pdf', async (event, defaultTitle: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      title: '导出为 PDF 文档',
      defaultPath: `${defaultTitle || 'Document'}.pdf`,
      filters: [{ name: 'PDF 文档', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return null;

    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
    });
    await fs.promises.writeFile(result.filePath, pdfData);
    return result.filePath;
  });

  ipcMain.handle('export:html', async (event, defaultTitle: string, htmlContent: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      title: '导出为 HTML 网页',
      defaultPath: `${defaultTitle || 'Document'}.html`,
      filters: [{ name: 'HTML 网页', extensions: ['html'] }],
    });
    if (result.canceled || !result.filePath) return null;

    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${defaultTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; max-width: 860px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #24292e; background-color: #fff; }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    code { font-family: Consolas, Monaco, "Courier New", monospace; padding: 0.2em 0.4em; margin: 0; font-size: 85%; background-color: rgba(27,31,35,0.05); border-radius: 3px; }
    pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 6px; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0; padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    tr:nth-child(2n) { background-color: #f6f8fa; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    await fs.promises.writeFile(result.filePath, fullHTML, 'utf-8');
    return result.filePath;
  });

  ipcMain.handle('export:image', async (event, defaultTitle: string) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showSaveDialog(win, {
      title: '导出为图片 (PNG)',
      defaultPath: `${defaultTitle || 'Document'}.png`,
      filters: [{ name: 'PNG 图片', extensions: ['png'] }],
    });
    if (result.canceled || !result.filePath) return null;

    const image = await win.webContents.capturePage();
    await fs.promises.writeFile(result.filePath, image.toPNG());
    return result.filePath;
  });

  ipcMain.handle('export:text', async (event, defaultTitle: string, content: string, ext = 'txt') => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const filterName = ext === 'md' ? 'Markdown 文档' : '纯文本文件';
    const result = await dialog.showSaveDialog(win, {
      title: `导出为 ${filterName}`,
      defaultPath: `${defaultTitle || 'Document'}.${ext}`,
      filters: [{ name: filterName, extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return null;

    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return result.filePath;
  });
}
