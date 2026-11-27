/**
 * @file scripts/build-installer.cs
 * @description Windows 原生单文件自解压安装向导源码（WinForms DPI 适配界面、升级保留配置、快捷方式与系统注册）
 * @module 构建与打包脚本
 */
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("MarkForge 安装向导")]
[assembly: AssemblyDescription("MarkForge")]
[assembly: AssemblyCompany("MarkForge Team")]
[assembly: AssemblyProduct("MarkForge")]
[assembly: AssemblyCopyright("Copyright (C) 2026 MarkForge Team")]
[assembly: AssemblyFileVersion("1.0.3.0")]
[assembly: AssemblyVersion("1.0.3.0")]

namespace MarkForgeInstaller
{
    static class Program
    {
        [DllImport("user32.dll")]
        private static extern bool SetProcessDPIAware();

        [STAThread]
        static void Main(string[] args)
        {
            try { SetProcessDPIAware(); } catch { }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm(args));
        }
    }

    public class InstallerForm : Form
    {
        [DllImport("gdi32.dll")]
        private static extern IntPtr CreateRoundRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect, int nWidthEllipse, int nHeightEllipse);

        [DllImport("user32.dll")]
        private static extern bool ReleaseCapture();

        [DllImport("user32.dll")]
        private static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);

        private enum State { Ready, Installing, Completed, Error }

        private State _state = State.Ready;
        private float _dpi = 1.0f;
        private bool _isCustomOpen = false;
        private bool _createDesktopAndAssoc = true;
        private string _targetDir = "";
        private bool _isUpgradeMode = false;
        private string _installedVersion = "";
        private int _progress = 0;
        private string _statusMsg = "准备就绪";
        private string _errorMsg = "";

        private TextBox _pathBox;
        private string _hoverId = "";
        private string _downId = "";

        private struct HitBox
        {
            public string Id;
            public Rectangle Rect;
        }
        private readonly List<HitBox> _hitBoxes = new List<HitBox>();

        private int S(float v) { return (int)Math.Round(v * _dpi); }
        private float Sf(float v) { return v * _dpi; }

        private bool _autoStart = false;
        private string _screenshotPath = null;
        private string _screenshotCompletedPath = null;

        public InstallerForm(string[] args)
        {
            if (args != null && args.Length > 0)
            {
                for (int i = 0; i < args.Length; i++)
                {
                    string arg = args[i];
                    if (string.Equals(arg, "--auto", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(arg, "--silent", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(arg, "/S", StringComparison.OrdinalIgnoreCase))
                    {
                        _autoStart = true;
                    }
                    else if (string.Equals(arg, "--screenshot", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                    {
                        _screenshotPath = args[i + 1];
                    }
                    else if (string.Equals(arg, "--screenshot-completed", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                    {
                        _screenshotCompletedPath = args[i + 1];
                    }
                }
            }

            using (Graphics g = CreateGraphics())
            {
                _dpi = g.DpiX / 96.0f;
            }

            DetectExistingInstallation();

            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(S(800), S(500));
            BackColor = Color.FromArgb(18, 19, 24);
            DoubleBuffered = true;
            Text = "MarkForge 安装向导";

            try
            {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            Region = Region.FromHrgn(CreateRoundRectRgn(0, 0, ClientSize.Width + 1, ClientSize.Height + 1, S(16), S(16)));

            _pathBox = new TextBox
            {
                Text = _targetDir,
                BackColor = Color.FromArgb(13, 14, 19),
                ForeColor = Color.FromArgb(228, 228, 231),
                BorderStyle = BorderStyle.None,
                Font = new Font("Consolas", 9f, FontStyle.Regular),
                Visible = false
            };
            _pathBox.TextChanged += (s, e) =>
            {
                _targetDir = _pathBox.Text.Trim();
                UpdateUpgradeState();
                Invalidate();
            };
            Controls.Add(_pathBox);

            MouseDown += OnFormMouseDown;
            MouseMove += OnFormMouseMove;
            MouseUp += OnFormMouseUp;
            MouseLeave += (s, e) => { if (_hoverId != "") { _hoverId = ""; Cursor = Cursors.Default; Invalidate(); } };

            if (!string.IsNullOrEmpty(_screenshotPath))
            {
                try
                {
                    using (Bitmap bmp = new Bitmap(ClientSize.Width, ClientSize.Height))
                    {
                        using (Graphics g = Graphics.FromImage(bmp))
                        {
                            OnPaint(new PaintEventArgs(g, new Rectangle(0, 0, ClientSize.Width, ClientSize.Height)));
                        }
                        bmp.Save(_screenshotPath, System.Drawing.Imaging.ImageFormat.Png);
                    }
                }
                catch { }
            }

            if (!string.IsNullOrEmpty(_screenshotCompletedPath))
            {
                try
                {
                    _state = State.Completed;
                    using (Bitmap bmp = new Bitmap(ClientSize.Width, ClientSize.Height))
                    {
                        using (Graphics g = Graphics.FromImage(bmp))
                        {
                            OnPaint(new PaintEventArgs(g, new Rectangle(0, 0, ClientSize.Width, ClientSize.Height)));
                        }
                        bmp.Save(_screenshotCompletedPath, System.Drawing.Imaging.ImageFormat.Png);
                    }
                }
                catch { }
            }

            Shown += (s, e) =>
            {
                if (!string.IsNullOrEmpty(_screenshotPath) || !string.IsNullOrEmpty(_screenshotCompletedPath))
                {
                    Application.Exit();
                    return;
                }

                if (_autoStart && _state == State.Ready)
                {
                    StartInstall();
                }
            };
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Enter)
            {
                if (_state == State.Ready) { StartInstall(); return true; }
                if (_state == State.Completed) { LaunchInstalledApp(); return true; }
                if (_state == State.Error) { StartInstall(); return true; }
            }
            if (keyData == Keys.Escape)
            {
                Application.Exit();
                return true;
            }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        private void DetectExistingInstallation()
        {
            string detected = null;
            try
            {
                using (RegistryKey reg = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\MarkForge"))
                {
                    if (reg != null)
                    {
                        object loc = reg.GetValue("InstallLocation");
                        if (loc != null && !string.IsNullOrWhiteSpace(loc.ToString()))
                        {
                            string p = loc.ToString().Trim();
                            if (Directory.Exists(p) && File.Exists(Path.Combine(p, "MarkForge.exe")))
                            {
                                detected = p;
                                object ver = reg.GetValue("DisplayVersion");
                                if (ver != null) _installedVersion = ver.ToString();
                            }
                        }
                    }
                }
            }
            catch { }

            string defaultPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "MarkForge");
            if (string.IsNullOrEmpty(detected) && File.Exists(Path.Combine(defaultPath, "MarkForge.exe")))
            {
                detected = defaultPath;
            }

            if (!string.IsNullOrEmpty(detected))
            {
                _targetDir = detected;
                _isUpgradeMode = true;
            }
            else
            {
                _targetDir = defaultPath;
                _isUpgradeMode = false;
            }
        }

        private void UpdateUpgradeState()
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(_targetDir) && File.Exists(Path.Combine(_targetDir, "MarkForge.exe")))
                {
                    _isUpgradeMode = true;
                }
                else
                {
                    _isUpgradeMode = false;
                }
            }
            catch
            {
                _isUpgradeMode = false;
            }
        }

        private string HitTest(Point pt)
        {
            for (int i = _hitBoxes.Count - 1; i >= 0; i--)
            {
                if (_hitBoxes[i].Rect.Contains(pt)) return _hitBoxes[i].Id;
            }
            return "";
        }

        private void OnFormMouseMove(object sender, MouseEventArgs e)
        {
            string id = HitTest(e.Location);
            if (id != _hoverId)
            {
                _hoverId = id;
                Cursor = string.IsNullOrEmpty(id) ? Cursors.Default : Cursors.Hand;
                Invalidate();
            }
        }

        private void OnFormMouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            string id = HitTest(e.Location);
            if (string.IsNullOrEmpty(id) && e.Y <= S(48))
            {
                ReleaseCapture();
                SendMessage(Handle, 0xA1, 0x2, 0);
                return;
            }
            _downId = id;
            Invalidate();
        }

        private void OnFormMouseUp(object sender, MouseEventArgs e)
        {
            if (e.Button != MouseButtons.Left) return;
            string id = HitTest(e.Location);
            string down = _downId;
            _downId = "";
            Invalidate();
            if (string.IsNullOrEmpty(id) || id != down) return;

            switch (id)
            {
                case "min":
                    WindowState = FormWindowState.Minimized;
                    break;
                case "close":
                    Application.Exit();
                    break;
                case "install":
                    StartInstall();
                    break;
                case "toggleCustom":
                    _isCustomOpen = !_isCustomOpen;
                    _pathBox.Visible = (_state == State.Ready && _isCustomOpen);
                    Invalidate();
                    break;
                case "browse":
                    using (var fbd = new FolderBrowserDialog())
                    {
                        fbd.Description = "选择 MarkForge 安装目标路径";
                        fbd.SelectedPath = Directory.Exists(_targetDir) ? _targetDir : Path.GetDirectoryName(_targetDir);
                        if (fbd.ShowDialog(this) == DialogResult.OK && !string.IsNullOrWhiteSpace(fbd.SelectedPath))
                        {
                            string sel = fbd.SelectedPath;
                            if (!sel.EndsWith("MarkForge", StringComparison.OrdinalIgnoreCase))
                            {
                                sel = Path.Combine(sel, "MarkForge");
                            }
                            _targetDir = sel;
                            _pathBox.Text = sel;
                            UpdateUpgradeState();
                            Invalidate();
                        }
                    }
                    break;
                case "shortcut":
                    _createDesktopAndAssoc = !_createDesktopAndAssoc;
                    Invalidate();
                    break;
                case "launch":
                    LaunchInstalledApp();
                    break;
                case "retry":
                    StartInstall();
                    break;
                case "back":
                    _state = State.Ready;
                    _pathBox.Visible = _isCustomOpen;
                    Invalidate();
                    break;
            }
        }

        private void StartInstall()
        {
            if (string.IsNullOrWhiteSpace(_targetDir))
            {
                MessageBox.Show("请选择有效的安装目录。", "提示", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _state = State.Installing;
            _pathBox.Visible = false;
            _progress = 6;
            _statusMsg = _isUpgradeMode ? "正在准备覆盖更新..." : "正在初始化安装目录...";
            Invalidate();

            string installPath = _targetDir;
            bool desktopAndAssoc = _createDesktopAndAssoc;

            Thread t = new Thread(() => DoInstall(installPath, desktopAndAssoc));
            t.IsBackground = true;
            t.Start();
        }

        private void UpdateProgress(int pct, string msg)
        {
            if (IsDisposed) return;
            try
            {
                BeginInvoke((Action)(() =>
                {
                    _progress = pct;
                    _statusMsg = msg;
                    Invalidate();
                }));
            }
            catch { }
        }

        private void KillRunningProcesses()
        {
            int currentPid = Process.GetCurrentProcess().Id;
            for (int attempt = 0; attempt < 3; attempt++)
            {
                bool any = false;
                try
                {
                    Process[] procs = Process.GetProcessesByName("MarkForge");
                    foreach (var p in procs)
                    {
                        if (p.Id != currentPid)
                        {
                            try { p.Kill(); any = true; } catch { }
                        }
                    }
                }
                catch { }

                if (!any) break;
                Thread.Sleep(200);
            }

            // 兜底 taskkill 确保子进程完全结束并释放文件句柄
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /IM MarkForge.exe")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (var proc = Process.Start(psi))
                {
                    if (proc != null) proc.WaitForExit(1000);
                }
            }
            catch { }

            Thread.Sleep(250);
        }

        private void DoInstall(string targetDir, bool createDesktopAndAssoc)
        {
            try
            {
                UpdateProgress(8, _isUpgradeMode ? "正在平滑停止旧版进程与释放资源..." : "正在检测并关闭残留进程...");
                KillRunningProcesses();

                Directory.CreateDirectory(targetDir);

                UpdateProgress(15, _isUpgradeMode ? "正在极速覆盖核心程序组件..." : "正在极速释放核心组件...");
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream resStream = asm.GetManifestResourceStream("MarkForge.payload.zip"))
                {
                    if (resStream == null)
                    {
                        throw new Exception("安装包内嵌载荷缺失，请重新构建安装包。");
                    }

                    using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
                    {
                        int total = Math.Max(1, archive.Entries.Count);
                        int count = 0;
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string destPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                            if (!destPath.StartsWith(Path.GetFullPath(targetDir), StringComparison.OrdinalIgnoreCase))
                            {
                                continue;
                            }

                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destPath);
                            }
                            else
                            {
                                Directory.CreateDirectory(Path.GetDirectoryName(destPath));

                                // 覆盖写入前清除只读属性，避免拒绝访问
                                if (File.Exists(destPath))
                                {
                                    try { File.SetAttributes(destPath, FileAttributes.Normal); } catch { }
                                }

                                // 弹性重试覆盖机制，避免文件锁瞬时冲突
                                int maxRetries = 6;
                                for (int r = 1; r <= maxRetries; r++)
                                {
                                    try
                                    {
                                        entry.ExtractToFile(destPath, true);
                                        break;
                                    }
                                    catch (Exception ex)
                                    {
                                        if (r == maxRetries)
                                        {
                                            throw new Exception(string.Format("写入文件失败: {0} ({1})", Path.GetFileName(destPath), ex.Message));
                                        }
                                        Thread.Sleep(150);
                                    }
                                }
                            }

                            count++;
                            if (count % 3 == 0 || count == total)
                            {
                                int pct = 15 + (int)(72.0 * count / total);
                                UpdateProgress(pct, string.Format(_isUpgradeMode ? "正在更新组件 ({0}/{1})..." : "正在部署组件 ({0}/{1})...", count, total));
                            }
                        }
                    }
                }

                string targetExe = Path.Combine(targetDir, "MarkForge.exe");
                string targetUninstaller = Path.Combine(targetDir, "Uninstall MarkForge.exe");
                string iconPath = Path.Combine(targetDir, "resources", "icon.ico");
                if (!File.Exists(iconPath)) iconPath = targetExe;

                UpdateProgress(90, "正在更新快捷方式与卸载索引...");
                CreateShortcuts(targetDir, targetExe, targetUninstaller, createDesktopAndAssoc);

                UpdateProgress(96, "正在配置系统关联...");
                RegisterWindowsIntegration(targetDir, targetExe, targetUninstaller, iconPath, createDesktopAndAssoc);

                UpdateProgress(100, _isUpgradeMode ? "覆盖更新完成" : "安装完成");
                Thread.Sleep(200);

                if (!IsDisposed)
                {
                    BeginInvoke((Action)(() =>
                    {
                        _state = State.Completed;
                        Invalidate();
                    }));
                }
            }
            catch (Exception ex)
            {
                if (!IsDisposed)
                {
                    BeginInvoke((Action)(() =>
                    {
                        _state = State.Error;
                        _errorMsg = ex.Message;
                        Invalidate();
                    }));
                }
            }
        }

        private void CreateShortcuts(string targetDir, string targetExe, string targetUninstaller, bool createDesktop)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType == null) return;
                dynamic ws = Activator.CreateInstance(shellType);

                if (createDesktop)
                {
                    string desktopLnk = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "MarkForge.lnk");
                    dynamic s = ws.CreateShortcut(desktopLnk);
                    s.TargetPath = targetExe;
                    s.WorkingDirectory = targetDir;
                    s.Description = "MarkForge";
                    s.Save();
                }

                string startPrograms = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                Directory.CreateDirectory(startPrograms);

                dynamic s2 = ws.CreateShortcut(Path.Combine(startPrograms, "MarkForge.lnk"));
                s2.TargetPath = targetExe;
                s2.WorkingDirectory = targetDir;
                s2.Save();

                if (File.Exists(targetUninstaller))
                {
                    dynamic s3 = ws.CreateShortcut(Path.Combine(startPrograms, "卸载 MarkForge.lnk"));
                    s3.TargetPath = targetUninstaller;
                    s3.WorkingDirectory = targetDir;
                    s3.Description = "卸载 MarkForge (墨拓笔记)";
                    s3.Save();
                }
            }
            catch { }
        }

        private void RegisterWindowsIntegration(string targetDir, string targetExe, string targetUninstaller, string iconPath, bool assocMd)
        {
            try
            {
                using (RegistryKey reg = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\MarkForge"))
                {
                    if (reg != null)
                    {
                        reg.SetValue("DisplayName", "MarkForge (墨拓笔记)");
                        reg.SetValue("DisplayVersion", "1.0.3");
                        reg.SetValue("Publisher", "MarkForge Team");
                        reg.SetValue("InstallLocation", targetDir);
                        reg.SetValue("DisplayIcon", iconPath);
                        reg.SetValue("UninstallString", "\"" + targetUninstaller + "\"");
                        reg.SetValue("QuietUninstallString", "\"" + targetUninstaller + "\" --silent");
                        reg.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
                        reg.SetValue("EstimatedSize", 260000, RegistryValueKind.DWord);
                        reg.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        reg.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }

                using (RegistryKey appKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\Applications\MarkForge.exe"))
                {
                    if (appKey != null)
                    {
                        appKey.SetValue("FriendlyAppName", "MarkForge");
                        using (var cmd = appKey.CreateSubKey(@"shell\open\command"))
                        {
                            if (cmd != null) cmd.SetValue("", "\"" + targetExe + "\" \"%1\"");
                        }
                        if (assocMd)
                        {
                            using (var sup = appKey.CreateSubKey("SupportedTypes"))
                            {
                                if (sup != null) { sup.SetValue(".md", ""); sup.SetValue(".markdown", ""); }
                            }
                        }
                    }
                }

                if (assocMd)
                {
                    using (RegistryKey progKey = Registry.CurrentUser.CreateSubKey(@"Software\Classes\MarkForge.Document"))
                    {
                        if (progKey != null)
                        {
                            progKey.SetValue("", "Markdown 文档");
                            using (var di = progKey.CreateSubKey("DefaultIcon"))
                            {
                                if (di != null) di.SetValue("", "\"" + iconPath + "\",0");
                            }
                            using (var cmd = progKey.CreateSubKey(@"shell\open\command"))
                            {
                                if (cmd != null) cmd.SetValue("", "\"" + targetExe + "\" \"%1\"");
                            }
                        }
                    }

                    using (var ow1 = Registry.CurrentUser.CreateSubKey(@"Software\Classes\.md\OpenWithProgids"))
                    {
                        if (ow1 != null) ow1.SetValue("MarkForge.Document", "");
                    }
                    using (var ow2 = Registry.CurrentUser.CreateSubKey(@"Software\Classes\.markdown\OpenWithProgids"))
                    {
                        if (ow2 != null) ow2.SetValue("MarkForge.Document", "");
                    }
                }

                using (var mui = Registry.CurrentUser.OpenSubKey(@"Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache", true))
                {
                    if (mui != null)
                    {
                        mui.SetValue(targetExe + ".FriendlyAppName", "MarkForge");
                        mui.SetValue(targetExe + ".ApplicationCompany", "MarkForge Team");
                    }
                }
            }
            catch { }
        }

        private void LaunchInstalledApp()
        {
            string targetExe = Path.Combine(_targetDir, "MarkForge.exe");
            if (File.Exists(targetExe))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = targetExe,
                        WorkingDirectory = _targetDir,
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                }
                catch { }
            }
            Application.Exit();
        }

        private static GraphicsPath RoundRect(Rectangle r, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int d = radius * 2;
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            _hitBoxes.Clear();
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            int w = ClientSize.Width;
            int h = ClientSize.Height;

            // Deep dark studio background
            using (var bgBrush = new SolidBrush(Color.FromArgb(18, 19, 24)))
            {
                g.FillRectangle(bgBrush, 0, 0, w, h);
            }

            // Subtle top ambient spotlight
            using (var glowPath = new GraphicsPath())
            {
                glowPath.AddEllipse(w / 2 - S(220), -S(90), S(440), S(240));
                using (var pgb = new PathGradientBrush(glowPath))
                {
                    pgb.CenterColor = Color.FromArgb(26, 56, 189, 248);
                    pgb.SurroundColors = new[] { Color.FromArgb(0, 56, 189, 248) };
                    g.FillPath(pgb, glowPath);
                }
            }

            // Minimal floating top chrome (no thick divider bar)
            using (var fVer = new Font("Consolas", 8.5f, FontStyle.Regular))
            using (var bVer = new SolidBrush(Color.FromArgb(92, 92, 102)))
            {
                g.DrawString("MarkForge · v1.0.3", fVer, bVer, S(22), S(16));
            }

            Rectangle minRect = new Rectangle(w - S(72), S(10), S(28), S(28));
            Rectangle closeRect = new Rectangle(w - S(38), S(10), S(28), S(28));
            _hitBoxes.Add(new HitBox { Id = "min", Rect = minRect });
            _hitBoxes.Add(new HitBox { Id = "close", Rect = closeRect });

            if (_hoverId == "min")
            {
                using (var gp = RoundRect(minRect, S(7)))
                using (var b = new SolidBrush(Color.FromArgb(40, 42, 52)))
                    g.FillPath(b, gp);
            }
            using (var p = new Pen(_hoverId == "min" ? Color.White : Color.FromArgb(120, 122, 134), Sf(1.5f)))
            {
                int cy = minRect.Y + minRect.Height / 2;
                g.DrawLine(p, minRect.X + S(9), cy, minRect.Right - S(9), cy);
            }

            if (_hoverId == "close")
            {
                using (var gp = RoundRect(closeRect, S(7)))
                using (var b = new SolidBrush(Color.FromArgb(215, 38, 56)))
                    g.FillPath(b, gp);
            }
            using (var p = new Pen(_hoverId == "close" ? Color.White : Color.FromArgb(120, 122, 134), Sf(1.5f)))
            {
                int pad = S(9);
                g.DrawLine(p, closeRect.X + pad, closeRect.Y + pad, closeRect.Right - pad, closeRect.Bottom - pad);
                g.DrawLine(p, closeRect.Right - pad, closeRect.Y + pad, closeRect.X + pad, closeRect.Bottom - pad);
            }

            if (_state == State.Ready) PaintReady(g, w, h);
            else if (_state == State.Installing) PaintInstalling(g, w, h);
            else if (_state == State.Completed) PaintCompleted(g, w, h);
            else PaintError(g, w, h);

            // Outer rounded card border
            using (var gp = RoundRect(new Rectangle(0, 0, w - 1, h - 1), S(16)))
            using (var bp = new Pen(Color.FromArgb(63, 63, 72), 1))
            {
                g.DrawPath(bp, gp);
            }
        }

        private void PaintHeroBadge(Graphics g, int w, int yTop, Color borderCol, string symbol, Color symCol, bool isLogoM)
        {
            Rectangle badgeRect = new Rectangle(w / 2 - S(38), yTop, S(76), S(76));
            using (var gp = RoundRect(badgeRect, S(20)))
            using (var lg = new LinearGradientBrush(badgeRect, Color.FromArgb(29, 34, 48), Color.FromArgb(14, 16, 23), 135f))
            using (var bp = new Pen(borderCol, Sf(1.5f)))
            {
                g.FillPath(lg, gp);
                g.DrawPath(bp, gp);
            }

            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                if (isLogoM)
                {
                    using (var fBig = new Font("Consolas", 27f, FontStyle.Bold))
                    using (var lg = new LinearGradientBrush(badgeRect, Color.FromArgb(125, 211, 252), Color.FromArgb(59, 130, 246), 135f))
                    {
                        g.DrawString("M", fBig, lg, badgeRect, sf);
                    }
                }
                else
                {
                    using (var fSym = new Font("Segoe UI Symbol", 24f, FontStyle.Bold))
                    using (var br = new SolidBrush(symCol))
                    {
                        g.DrawString(symbol, fSym, br, badgeRect, sf);
                    }
                }
            }
        }

        private void PaintPrimaryButton(Graphics g, Rectangle rect, string id, string text)
        {
            _hitBoxes.Add(new HitBox { Id = id, Rect = rect });
            Color c1 = _hoverId == id ? Color.FromArgb(56, 189, 248) : Color.FromArgb(14, 165, 233);
            Color c2 = _hoverId == id ? Color.FromArgb(59, 130, 246) : Color.FromArgb(37, 99, 235);
            using (var gp = RoundRect(rect, S(12)))
            using (var lg = new LinearGradientBrush(rect, c1, c2, 0f))
            {
                g.FillPath(lg, gp);
            }
            using (var fBtn = new Font("Microsoft YaHei UI", 10.5f, FontStyle.Bold))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                g.DrawString(text, fBtn, Brushes.White, rect, sf);
            }
        }

        private void PaintReady(Graphics g, int w, int h)
        {
            int shift = _isCustomOpen ? S(38) : 0;

            PaintHeroBadge(g, w, S(104) - shift, Color.FromArgb(95, 56, 189, 248), "M", Color.White, true);

            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
            using (var fHead = new Font("Microsoft YaHei UI", 18.5f, FontStyle.Bold))
            using (var fSub = new Font("Microsoft YaHei UI", 9.5f, FontStyle.Regular))
            {
                g.DrawString("MarkForge", fHead, Brushes.White, new RectangleF(S(40), S(198) - shift, w - S(80), S(36)), sf);

                if (_isUpgradeMode)
                {
                    using (var bUpgrade = new SolidBrush(Color.FromArgb(56, 189, 248)))
                    {
                        g.DrawString("检测到已安装版本，点击下方按钮直接原位覆盖升级", fSub, bUpgrade, new RectangleF(S(40), S(236) - shift, w - S(80), S(24)), sf);
                    }
                }
                else
                {
                    using (var bSub = new SolidBrush(Color.FromArgb(161, 161, 170)))
                    {
                        g.DrawString("墨拓笔记 · 极简 Markdown 桌面工作台", fSub, bSub, new RectangleF(S(40), S(236) - shift, w - S(80), S(24)), sf);
                    }
                }
            }

            Rectangle btnRect = new Rectangle(w / 2 - S(140), S(288) - shift, S(280), S(44));
            PaintPrimaryButton(g, btnRect, "install", _isUpgradeMode ? "覆 盖 更 新" : "立 即 安 装");

            // Collapsible Custom Directory Drawer (580px centered)
            int boxW = S(580);
            int boxX = (w - boxW) / 2;
            int footY = h - S(56);

            if (_isCustomOpen)
            {
                Rectangle panelRect = new Rectangle(boxX, footY - S(84), boxW, S(72));
                using (var gp = RoundRect(panelRect, S(11)))
                using (var pb = new SolidBrush(Color.FromArgb(24, 26, 34)))
                using (var pp = new Pen(Color.FromArgb(44, 46, 58), 1))
                {
                    g.FillPath(pb, gp);
                    g.DrawPath(pp, gp);
                }

                Rectangle inputRect = new Rectangle(panelRect.X + S(12), panelRect.Y + S(11), panelRect.Width - S(94), S(28));
                using (var gp = RoundRect(inputRect, S(7)))
                using (var ib = new SolidBrush(Color.FromArgb(13, 14, 19)))
                using (var ip = new Pen(Color.FromArgb(39, 39, 48), 1))
                {
                    g.FillPath(ib, gp);
                    g.DrawPath(ip, gp);
                }

                _pathBox.SetBounds(inputRect.X + S(10), inputRect.Y + S(6), inputRect.Width - S(20), S(18));
                if (!_pathBox.Visible) _pathBox.Visible = true;

                Rectangle brwRect = new Rectangle(inputRect.Right + S(8), inputRect.Y, S(62), S(28));
                _hitBoxes.Add(new HitBox { Id = "browse", Rect = brwRect });
                using (var gp = RoundRect(brwRect, S(7)))
                using (var bb = new SolidBrush(_hoverId == "browse" ? Color.FromArgb(63, 63, 76) : Color.FromArgb(39, 39, 48)))
                using (var bp = new Pen(Color.FromArgb(63, 63, 76), 1))
                {
                    g.FillPath(bb, gp);
                    g.DrawPath(bp, gp);
                }
                using (var fBrw = new Font("Microsoft YaHei UI", 8.5f))
                using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                {
                    g.DrawString("浏览", fBrw, Brushes.Gainsboro, brwRect, sf);
                }

                using (var fDisk = new Font("Microsoft YaHei UI", 8f))
                using (var bGray = new SolidBrush(Color.FromArgb(113, 113, 122)))
                using (var bOk = new SolidBrush(Color.FromArgb(52, 211, 153)))
                using (var sfR = new StringFormat { Alignment = StringAlignment.Far })
                {
                    g.DrawString(_isUpgradeMode ? "原位更新模式 · 保留所有文档与个人数据" : "需约 255 MB 磁盘空间", fDisk, bGray, panelRect.X + S(14), panelRect.Y + S(47));
                    g.DrawString("准备就绪", fDisk, bOk, panelRect.Right - S(14), panelRect.Y + S(47), sfR);
                }
            }
            else if (_pathBox.Visible)
            {
                _pathBox.Visible = false;
            }

            // Minimal Footer Bar (580px centered)
            using (var p = new Pen(Color.FromArgb(38, 39, 48), 1))
            {
                g.DrawLine(p, boxX, footY, boxX + boxW, footY);
            }

            Rectangle chkHit = new Rectangle(boxX, footY + S(12), S(230), S(24));
            _hitBoxes.Add(new HitBox { Id = "shortcut", Rect = chkHit });
            Rectangle boxRect = new Rectangle(boxX, footY + S(17), S(14), S(14));
            using (var gp = RoundRect(boxRect, S(4)))
            using (var cb = new SolidBrush(_createDesktopAndAssoc ? Color.FromArgb(14, 165, 233) : Color.FromArgb(39, 39, 46)))
            using (var cp = new Pen(_createDesktopAndAssoc ? Color.FromArgb(56, 189, 248) : Color.FromArgb(82, 82, 91), 1))
            {
                g.FillPath(cb, gp);
                g.DrawPath(cp, gp);
            }
            if (_createDesktopAndAssoc)
            {
                using (var cp = new Pen(Color.White, Sf(1.8f)))
                {
                    g.DrawLines(cp, new[] {
                        new Point(boxRect.X + S(3), boxRect.Y + S(7)),
                        new Point(boxRect.X + S(6), boxRect.Y + S(10)),
                        new Point(boxRect.X + S(11), boxRect.Y + S(4))
                    });
                }
            }

            Rectangle togHit = new Rectangle(boxX + boxW - S(105), footY + S(12), S(105), S(24));
            _hitBoxes.Add(new HitBox { Id = "toggleCustom", Rect = togHit });

            using (var fFoot = new Font("Microsoft YaHei UI", 8.5f))
            using (var bTxt = new SolidBrush(Color.FromArgb(161, 161, 170)))
            using (var bTog = new SolidBrush(_hoverId == "toggleCustom" ? Color.FromArgb(56, 189, 248) : Color.FromArgb(161, 161, 170)))
            using (var sfR = new StringFormat { Alignment = StringAlignment.Far })
            {
                g.DrawString("创建桌面快捷方式并关联 .md", fFoot, bTxt, boxX + S(22), footY + S(15));
                g.DrawString(_isCustomOpen ? "自定义目录 ▲" : "自定义目录 ▼", fFoot, bTog, boxX + boxW, footY + S(15), sfR);
            }
        }

        private void PaintInstalling(Graphics g, int w, int h)
        {
            PaintHeroBadge(g, w, S(124), Color.FromArgb(110, 56, 189, 248), "M", Color.White, true);

            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
            using (var fHead = new Font("Microsoft YaHei UI", 16f, FontStyle.Bold))
            {
                g.DrawString(_isUpgradeMode ? "正在覆盖更新..." : "正在安装...", fHead, Brushes.White, new RectangleF(S(40), S(224), w - S(80), S(32)), sf);
            }

            int barW = S(460);
            int barX = (w - barW) / 2;
            int barY = S(312);

            using (var fStat = new Font("Microsoft YaHei UI", 8.5f))
            using (var fPct = new Font("Consolas", 9.5f, FontStyle.Bold))
            using (var bStat = new SolidBrush(Color.FromArgb(161, 161, 170)))
            using (var bPct = new SolidBrush(Color.FromArgb(56, 189, 248)))
            using (var sfR = new StringFormat { Alignment = StringAlignment.Far })
            {
                g.DrawString(_statusMsg, fStat, bStat, barX, barY - S(24));
                g.DrawString(_progress + "%", fPct, bPct, barX + barW, barY - S(24), sfR);
            }

            Rectangle track = new Rectangle(barX, barY, barW, S(8));
            using (var gp = RoundRect(track, S(4)))
            using (var tb = new SolidBrush(Color.FromArgb(24, 24, 30)))
            using (var tp = new Pen(Color.FromArgb(39, 39, 48), 1))
            {
                g.FillPath(tb, gp);
                g.DrawPath(tp, gp);
            }

            int fillW = Math.Max(S(8), (int)(barW * Math.Min(100, Math.Max(5, _progress)) / 100.0));
            Rectangle fill = new Rectangle(barX + 1, barY + 1, fillW - 2, S(6));
            using (var gp = RoundRect(fill, S(3)))
            using (var lg = new LinearGradientBrush(fill, Color.FromArgb(56, 189, 248), Color.FromArgb(59, 130, 246), 0f))
            {
                g.FillPath(lg, gp);
            }

            using (var sf = new StringFormat { Alignment = StringAlignment.Center, Trimming = StringTrimming.EllipsisPath })
            using (var fPath = new Font("Consolas", 8.5f))
            using (var bMute = new SolidBrush(Color.FromArgb(92, 92, 102)))
            {
                g.DrawString(_targetDir, fPath, bMute, new RectangleF(barX, barY + S(22), barW, S(20)), sf);
            }
        }

        private void PaintCompleted(Graphics g, int w, int h)
        {
            PaintHeroBadge(g, w, S(112), Color.FromArgb(115, 52, 211, 153), "✓", Color.FromArgb(52, 211, 153), false);

            using (var sf = new StringFormat { Alignment = StringAlignment.Center, Trimming = StringTrimming.EllipsisPath })
            using (var fHead = new Font("Microsoft YaHei UI", 18.5f, FontStyle.Bold))
            using (var fSub = new Font("Microsoft YaHei UI", 9.5f))
            using (var fPath = new Font("Consolas", 8.5f))
            using (var bSub = new SolidBrush(Color.FromArgb(52, 211, 153)))
            using (var bPath = new SolidBrush(Color.FromArgb(140, 140, 150)))
            {
                g.DrawString(_isUpgradeMode ? "更新完成" : "安装完成", fHead, Brushes.White, new RectangleF(S(40), S(206), w - S(80), S(34)), sf);
                if (_isUpgradeMode)
                {
                    g.DrawString("已成功覆盖升级至最新版本，数据及配置已完整保留", fSub, bSub, new RectangleF(S(40), S(244), w - S(80), S(20)), sf);
                }
                g.DrawString(_targetDir, fPath, bPath, new RectangleF(S(140), S(266), w - S(280), S(20)), sf);
            }

            Rectangle launchRect = new Rectangle(w / 2 - S(140), S(308), S(280), S(44));
            PaintPrimaryButton(g, launchRect, "launch", "立 即 开 启");
        }

        private void PaintError(Graphics g, int w, int h)
        {
            PaintHeroBadge(g, w, S(104), Color.FromArgb(140, 239, 68, 68), "!", Color.FromArgb(248, 113, 113), false);

            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
            using (var fHead = new Font("Microsoft YaHei UI", 17f, FontStyle.Bold))
            using (var fErr = new Font("Microsoft YaHei UI", 9.5f))
            using (var bErr = new SolidBrush(Color.FromArgb(248, 113, 113)))
            {
                g.DrawString("安装遇到问题", fHead, Brushes.White, new RectangleF(S(40), S(200), w - S(80), S(32)), sf);
                g.DrawString(string.IsNullOrEmpty(_errorMsg) ? "安装过程中遭遇权限限制或磁盘读写错误。" : _errorMsg, fErr, bErr, new RectangleF(S(100), S(244), w - S(200), S(80)), sf);
            }

            int btnY = S(340);
            Rectangle backRect = new Rectangle(w / 2 - S(160), btnY, S(150), S(42));
            Rectangle retryRect = new Rectangle(w / 2 + S(10), btnY, S(150), S(42));
            _hitBoxes.Add(new HitBox { Id = "back", Rect = backRect });
            _hitBoxes.Add(new HitBox { Id = "retry", Rect = retryRect });

            using (var gp = RoundRect(backRect, S(11)))
            using (var b = new SolidBrush(_hoverId == "back" ? Color.FromArgb(63, 63, 74) : Color.FromArgb(39, 39, 46)))
                g.FillPath(b, gp);
            using (var gp = RoundRect(retryRect, S(11)))
            using (var b = new SolidBrush(_hoverId == "retry" ? Color.FromArgb(56, 189, 248) : Color.FromArgb(14, 165, 233)))
                g.FillPath(b, gp);

            using (var fBtn = new Font("Microsoft YaHei UI", 9.5f, FontStyle.Bold))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
            {
                g.DrawString("返回修改", fBtn, Brushes.Gainsboro, backRect, sf);
                g.DrawString("重试安装", fBtn, Brushes.White, retryRect, sf);
            }
        }
    }
}
