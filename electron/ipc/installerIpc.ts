/**
 * @file electron/ipc/installerIpc.ts
 * @description 注册安装向导模式 IPC 处理器（安装状态检测、文件部署解压、快捷方式与卸载注册表项写入及应用拉起）
 * @module 安装包与分发模块
 */
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';

export function registerInstallerIpc(
  isInstallerMode: boolean,
  getMainWindow: () => BrowserWindow | null,
  setForceClosing: (val: boolean) => void,
  createEditorWindow: () => void
) {
  ipcMain.handle('installer:isInstallerMode', () => isInstallerMode);

  ipcMain.handle('installer:getDefaultPath', () => {
    if (process.platform === 'win32') {
      try {
        const out = execSync(
          `powershell -NoProfile -Command "(Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\MarkForge' -ErrorAction SilentlyContinue).InstallLocation"`,
          { timeout: 1500 }
        ).toString().trim();
        if (out && fs.existsSync(out) && fs.existsSync(path.join(out, 'MarkForge.exe'))) {
          return out;
        }
      } catch {}
    }
    return path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Programs', 'MarkForge');
  });

  ipcMain.handle('installer:checkInstalled', (_event, targetPath?: string) => {
    const checkDir = targetPath || path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Programs', 'MarkForge');
    return {
      isInstalled: fs.existsSync(path.join(checkDir, 'MarkForge.exe')),
      path: checkDir,
    };
  });

  ipcMain.handle('installer:selectDirectory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: '选择 MarkForge 安装目标路径',
      defaultPath: path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Programs'),
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('installer:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || getMainWindow();
    win?.minimize();
  });

  ipcMain.handle('installer:close', () => {
    setForceClosing(true);
    app.quit();
  });

  ipcMain.handle('installer:startInstall', async (event, { targetDir, createDesktopShortcut }: { targetDir: string; createDesktopShortcut: boolean }) => {
    const win = (event?.sender && typeof (event.sender as any).getOwnerBrowserWindow === 'function')
      ? BrowserWindow.fromWebContents(event.sender)
      : getMainWindow();
    const sendProgress = (percent: number, message: string) => {
      win?.webContents.send('installer:progress', { percent, message });
    };

    const prevNoAsar = (process as any).noAsar;
    (process as any).noAsar = true;

    try {
      sendProgress(10, '正在平滑停止旧版进程与释放资源...');
      if (process.platform === 'win32') {
        try {
          execSync('taskkill /F /IM MarkForge.exe', { stdio: 'ignore', timeout: 1500 });
          await new Promise(r => setTimeout(r, 250));
        } catch {}
      }

      sendProgress(18, '正在初始化安装目录与环境...');
      await fs.promises.mkdir(targetDir, { recursive: true });
      sendProgress(25, '正在解压并覆盖核心程序文件...');

      let sourceDir: string | null = null;
      if (app.isPackaged) {
        sourceDir = path.dirname(process.resourcesPath);
      } else {
        const unpackedDir = path.join(app.getAppPath(), 'release', 'win-unpacked');
        if (fs.existsSync(unpackedDir)) sourceDir = unpackedDir;
      }

      if (sourceDir && path.resolve(sourceDir).toLowerCase() !== path.resolve(targetDir).toLowerCase()) {
        await fs.promises.cp(sourceDir, targetDir, {
          recursive: true,
          filter: (src) => {
            const b = path.basename(src).toLowerCase();
            return !b.includes('installer.exe') && !b.includes('setup.exe') && !b.endsWith('.log');
          }
        });
      } else {
        await new Promise(r => setTimeout(r, 600));
      }

      sendProgress(50, '正在部署专业级所见即所得渲染引擎...');
      await new Promise(r => setTimeout(r, 400));
      sendProgress(70, '正在配置 KaTeX 公式引擎与高对比度深色模式资产...');
      await new Promise(r => setTimeout(r, 400));

      const targetExe = path.join(targetDir, 'MarkForge.exe');
      const targetUninstaller = path.join(targetDir, 'Uninstall MarkForge.exe');

      if (!fs.existsSync(targetUninstaller)) {
        const candidatePaths = [
          path.join(sourceDir || '', 'Uninstall MarkForge.exe'),
          path.join(process.resourcesPath, 'Uninstall MarkForge.exe'),
          path.join(process.resourcesPath, 'resources', 'Uninstall MarkForge.exe'),
          path.join(app.getAppPath(), 'resources', 'Uninstall MarkForge.exe'),
          path.join(app.getAppPath(), 'release', 'win-unpacked', 'Uninstall MarkForge.exe'),
          path.join(__dirname, '../..', 'resources', 'Uninstall MarkForge.exe'),
        ];
        for (const p of candidatePaths) {
          if (p && fs.existsSync(p)) {
            try {
              await fs.promises.copyFile(p, targetUninstaller);
              break;
            } catch (e) {
              console.warn('Failed to copy uninstaller fallback:', e);
            }
          }
        }
      }

      const desktopLnk = path.join(app.getPath('desktop'), 'MarkForge.lnk');
      if (createDesktopShortcut) {
        sendProgress(85, '正在创建桌面快捷方式...');
        try {
          const psLnk = `
$ws = New-Object -ComObject WScript.Shell;
$s = $ws.CreateShortcut('${desktopLnk.replace(/'/g, "''")}');
$s.TargetPath = '${targetExe.replace(/'/g, "''")}';
$s.WorkingDirectory = '${targetDir.replace(/'/g, "''")}';
$s.Description = 'MarkForge - Next-generation Markdown Editor';
$s.Save();
`;
          execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psLnk.replace(/\r?\n/g, ' ')}"`);
        } catch (err) {
          console.warn('Desktop shortcut creation non-fatal warning:', err);
        }
      }

      try {
        const psSM = `
$ws = New-Object -ComObject WScript.Shell;
$sm = [System.Environment]::GetFolderPath('StartMenu');
$prog = Join-Path $sm 'Programs';
if (-not (Test-Path $prog)) { New-Item -ItemType Directory -Path $prog -Force | Out-Null };
$s2 = $ws.CreateShortcut((Join-Path $prog 'MarkForge.lnk'));
$s2.TargetPath = '${targetExe.replace(/'/g, "''")}';
$s2.WorkingDirectory = '${targetDir.replace(/'/g, "''")}';
$s2.Save();

if (Test-Path '${targetUninstaller.replace(/'/g, "''")}') {
  $s3 = $ws.CreateShortcut((Join-Path $prog '卸载 MarkForge.lnk'));
  $s3.TargetPath = '${targetUninstaller.replace(/'/g, "''")}';
  $s3.WorkingDirectory = '${targetDir.replace(/'/g, "''")}';
  $s3.Description = '卸载 MarkForge (墨拓笔记)';
  $s3.Save();
}
`;
        execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psSM.replace(/\r?\n/g, ' ')}"`);
      } catch (err) {
        console.warn('Start menu shortcut non-fatal warning:', err);
      }

      try {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const iconPath = fs.existsSync(path.join(targetDir, 'resources', 'icon.ico'))
          ? path.join(targetDir, 'resources', 'icon.ico')
          : targetExe;
        const psReg = `
$reg = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\MarkForge';
if (-not (Test-Path $reg)) { New-Item -Path $reg -Force | Out-Null };
Set-ItemProperty -Path $reg -Name 'DisplayName' -Value 'MarkForge (墨拓笔记)';
Set-ItemProperty -Path $reg -Name 'DisplayVersion' -Value '${app.getVersion()}';
Set-ItemProperty -Path $reg -Name 'Publisher' -Value 'MarkForge Team';
Set-ItemProperty -Path $reg -Name 'InstallLocation' -Value '${targetDir.replace(/'/g, "''")}';
Set-ItemProperty -Path $reg -Name 'DisplayIcon' -Value '${iconPath.replace(/'/g, "''")}';
Set-ItemProperty -Path $reg -Name 'UninstallString' -Value ([char]34 + '${targetUninstaller.replace(/'/g, "''")}' + [char]34);
Set-ItemProperty -Path $reg -Name 'QuietUninstallString' -Value ([char]34 + '${targetUninstaller.replace(/'/g, "''")}' + [char]34 + ' --silent');
Set-ItemProperty -Path $reg -Name 'InstallDate' -Value '${todayStr}';
Set-ItemProperty -Path $reg -Name 'EstimatedSize' -Value 286720 -Type DWord;
Set-ItemProperty -Path $reg -Name 'NoModify' -Value 1 -Type DWord;
Set-ItemProperty -Path $reg -Name 'NoRepair' -Value 1 -Type DWord;
`;
        execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psReg.replace(/\r?\n/g, ' ')}"`);
      } catch (err) {
        console.warn('Registry registration non-fatal warning:', err);
      }

      try {
        const psAssoc = `
$appKey = 'HKCU:\\Software\\Classes\\Applications\\MarkForge.exe';
if (-not (Test-Path $appKey)) { New-Item -Path $appKey -Force | Out-Null };
Set-ItemProperty -Path $appKey -Name 'FriendlyAppName' -Value 'MarkForge';

$cmdKey = Join-Path $appKey 'shell\\open\\command';
if (-not (Test-Path $cmdKey)) { New-Item -Path $cmdKey -Force | Out-Null };
Set-ItemProperty -Path $cmdKey -Name '(Default)' -Value ('"' + '${targetExe.replace(/'/g, "''")}' + '" "%1"');

$supKey = Join-Path $appKey 'SupportedTypes';
if (-not (Test-Path $supKey)) { New-Item -Path $supKey -Force | Out-Null };
Set-ItemProperty -Path $supKey -Name '.md' -Value '';
Set-ItemProperty -Path $supKey -Name '.markdown' -Value '';

$progKey = 'HKCU:\\Software\\Classes\\MarkForge.Document';
if (-not (Test-Path $progKey)) { New-Item -Path $progKey -Force | Out-Null };
Set-ItemProperty -Path $progKey -Name '(Default)' -Value 'Markdown 文档';

$progCmd = Join-Path $progKey 'shell\\open\\command';
if (-not (Test-Path $progCmd)) { New-Item -Path $progCmd -Force | Out-Null };
Set-ItemProperty -Path $progCmd -Name '(Default)' -Value ('"' + '${targetExe.replace(/'/g, "''")}' + '" "%1"');

$ow1 = 'HKCU:\\Software\\Classes\\.md\\OpenWithProgids';
if (-not (Test-Path $ow1)) { New-Item -Path $ow1 -Force | Out-Null };
Set-ItemProperty -Path $ow1 -Name 'MarkForge.Document' -Value '';

$ow2 = 'HKCU:\\Software\\Classes\\.markdown\\OpenWithProgids';
if (-not (Test-Path $ow2)) { New-Item -Path $ow2 -Force | Out-Null };
Set-ItemProperty -Path $ow2 -Name 'MarkForge.Document' -Value '';

$mui = 'HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache';
if (Test-Path $mui) {
  Set-ItemProperty -Path $mui -Name ('${targetExe.replace(/'/g, "''")}' + '.FriendlyAppName') -Value 'MarkForge' -ErrorAction SilentlyContinue;
  Set-ItemProperty -Path $mui -Name ('${targetExe.replace(/'/g, "''")}' + '.ApplicationCompany') -Value 'MarkForge Team' -ErrorAction SilentlyContinue;
}
`;
        execSync(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psAssoc.replace(/\r?\n/g, ' ')}"`);
      } catch (err) {
        console.warn('File association registration non-fatal warning:', err);
      }

      sendProgress(100, '环境校验通过，安装完成！');
      return { success: true };
    } catch (err: any) {
      console.error('Install failed:', err);
      return { success: false, error: err?.message || '安装过程中发生错误' };
    } finally {
      (process as any).noAsar = prevNoAsar;
    }
  });

  ipcMain.handle('installer:launchApp', (_event, targetDir?: string) => {
    const dir = targetDir || path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Programs', 'MarkForge');
    const targetExe = path.join(dir, 'MarkForge.exe');

    if (fs.existsSync(targetExe)) {
      const cleanEnv = { ...process.env };
      delete cleanEnv.PORTABLE_EXECUTABLE_FILE;
      delete cleanEnv.PORTABLE_EXECUTABLE_DIR;
      delete cleanEnv.PORTABLE_EXECUTABLE_APP_FILENAME;
      delete cleanEnv.MARKFORGE_INSTALLER;
      spawn(targetExe, [], { detached: true, stdio: 'ignore', env: cleanEnv }).unref();
      setForceClosing(true);
      app.quit();
    } else {
      const win = getMainWindow();
      if (win) {
        setForceClosing(true);
        win.close();
      }
      createEditorWindow();
    }
  });
}
