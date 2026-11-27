/**
 * @file scripts/build-uninstaller.cs
 * @description Windows 专用卸载向导源码（支持静默与交互模式，清理安装目录、桌面快捷方式及控制面板注册表项）
 * @module 构建与打包脚本
 */
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

[assembly: AssemblyTitle("MarkForge 卸载程序")]
[assembly: AssemblyDescription("MarkForge (墨拓笔记) 专用卸载向导")]
[assembly: AssemblyCompany("MarkForge Team")]
[assembly: AssemblyProduct("MarkForge")]
[assembly: AssemblyCopyright("Copyright (C) 2026 MarkForge Team")]
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: AssemblyVersion("1.0.0.0")]

namespace MarkForgeUninstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isSilent = false;
            foreach (var arg in args)
            {
                if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("-s", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("--silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/silent", StringComparison.OrdinalIgnoreCase))
                {
                    isSilent = true;
                }
            }

            string appTitle = "MarkForge 卸载向导";
            string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

            // Safety guard: prevent deleting root drives or system folders
            if (string.IsNullOrEmpty(installDir) || installDir.Length <= 3 ||
                installDir.IndexOf("Windows", StringComparison.OrdinalIgnoreCase) >= 0 ||
                installDir.IndexOf("System32", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                if (!isSilent)
                {
                    MessageBox.Show("检测到非法的安装路径，卸载已安全中止。", appTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                return;
            }

            if (!isSilent)
            {
                DialogResult dr = MessageBox.Show(
                    "您确定要完全卸载 MarkForge (墨拓笔记) 及其所有组件吗？\n\n此操作将删除该程序文件及桌面快捷方式。",
                    appTitle,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question,
                    MessageBoxDefaultButton.Button2
                );

                if (dr != DialogResult.Yes)
                {
                    return;
                }
            }

            // Close any running MarkForge instances
            try
            {
                foreach (var p in Process.GetProcessesByName("MarkForge"))
                {
                    try
                    {
                        p.Kill();
                        p.WaitForExit(3000);
                    }
                    catch { }
                }
            }
            catch { }

            int currentPid = Process.GetCurrentProcess().Id;
            string tempBatPath = Path.Combine(Path.GetTempPath(), "markforge_uninstall_" + Guid.NewGuid().ToString("N") + ".bat");

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("@echo off");
            sb.AppendLine("chcp 65001 >nul");
            sb.AppendLine("set WAIT_COUNT=0");
            sb.AppendLine(":WAIT_LOOP");
            sb.AppendLine(string.Format("tasklist /fi \"pid eq {0}\" 2>nul | find \"{0}\" >nul", currentPid));
            sb.AppendLine("if not errorlevel 1 (");
            sb.AppendLine("    timeout /t 1 /nobreak >nul");
            sb.AppendLine("    set /a WAIT_COUNT+=1");
            sb.AppendLine("    if %WAIT_COUNT% lss 10 goto WAIT_LOOP");
            sb.AppendLine(")");
            sb.AppendLine("timeout /t 1 /nobreak >nul");

            // 1. Delete Desktop shortcuts (user and common)
            sb.AppendLine("powershell -NoProfile -ExecutionPolicy Bypass -Command \"[System.IO.File]::Delete([System.IO.Path]::Combine([System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop), 'MarkForge.lnk')); [System.IO.File]::Delete([System.IO.Path]::Combine([System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::CommonDesktopDirectory), 'MarkForge.lnk'))\" 2>nul");

            // 2. Delete Start Menu shortcuts
            sb.AppendLine("powershell -NoProfile -ExecutionPolicy Bypass -Command \"[System.IO.File]::Delete([System.IO.Path]::Combine([System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::StartMenu), 'Programs\\MarkForge.lnk')); [System.IO.File]::Delete([System.IO.Path]::Combine([System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::CommonStartMenu), 'Programs\\MarkForge.lnk'))\" 2>nul");

            // 3. Delete Registry entries
            sb.AppendLine("powershell -NoProfile -ExecutionPolicy Bypass -Command \"Remove-Item -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\MarkForge' -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\MarkForge' -Recurse -Force -ErrorAction SilentlyContinue\" 2>nul");

            // 4. Delete install directory with retries
            sb.AppendLine(string.Format("set \"TARGET_DIR={0}\"", installDir));
            sb.AppendLine("set DEL_RETRY=0");
            sb.AppendLine(":DEL_DIR_LOOP");
            sb.AppendLine("if exist \"%TARGET_DIR%\" (");
            sb.AppendLine("    rd /s /q \"%TARGET_DIR%\" 2>nul");
            sb.AppendLine("    if exist \"%TARGET_DIR%\" (");
            sb.AppendLine("        timeout /t 1 /nobreak >nul");
            sb.AppendLine("        set /a DEL_RETRY+=1");
            sb.AppendLine("        if %DEL_RETRY% lss 6 goto DEL_DIR_LOOP");
            sb.AppendLine("    )");
            sb.AppendLine(")");

            // 5. Completion notice if not silent
            if (!isSilent)
            {
                sb.AppendLine("powershell -NoProfile -ExecutionPolicy Bypass -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('MarkForge (墨拓笔记) 已成功从您的计算机中完全卸载。', 'MarkForge 卸载向导', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)\" 2>nul");
            }

            // 6. Self-delete the batch file
            sb.AppendLine("(goto) 2>nul & del \"%~f0\"");

            try
            {
                File.WriteAllText(tempBatPath, sb.ToString(), Encoding.GetEncoding(65001));

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c \"" + tempBatPath + "\"";
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                if (!isSilent)
                {
                    MessageBox.Show("卸载过程中发生错误: " + ex.Message, appTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }

            Environment.Exit(0);
        }
    }
}
