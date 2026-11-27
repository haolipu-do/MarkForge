/**
 * @file src/components/Installer.tsx
 * @description MarkForge 桌面端图形化安装向导界面（支持目录选择、升级检测、进度条展示及完成后启动应用）
 * @module 安装向导界面模块
 */
import React, { useState, useEffect } from 'react';
import { Minus, X, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { CURRENT_APP_VERSION } from '../data/changelog';

export const Installer: React.FC = () => {
  const [installState, setInstallState] = useState<'ready' | 'installing' | 'completed' | 'error'>('ready');
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('');
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [createDesktopShortcut, setCreateDesktopShortcut] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('准备就绪');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('installer-mode', 'dark');
    document.body.classList.add('installer-mode');

    const initPath = async () => {
      if (window.electronAPI?.installer?.getDefaultPath) {
        try {
          const defaultPath = await window.electronAPI.installer.getDefaultPath();
          setTargetPath(defaultPath);
          if (window.electronAPI.installer.checkInstalled) {
            const res = await window.electronAPI.installer.checkInstalled(defaultPath);
            setIsUpgrade(!!res?.isInstalled);
          }
        } catch (e) {
          console.error('Failed to get default path', e);
        }
      } else {
        setTargetPath('C:\\Program Files\\MarkForge');
      }
    };
    initPath();

    if (window.electronAPI?.installer?.onProgress) {
      const unsub = window.electronAPI.installer.onProgress((data) => {
        setProgress(data.percent);
        setStatusMessage(data.message);
      });
      return () => {
        unsub?.();
      };
    }
  }, []);

  const handleTargetPathChange = async (newPath: string) => {
    setTargetPath(newPath);
    if (window.electronAPI?.installer?.checkInstalled) {
      try {
        const res = await window.electronAPI.installer.checkInstalled(newPath);
        setIsUpgrade(!!res?.isInstalled);
      } catch {}
    }
  };

  const handleSelectDirectory = async () => {
    if (window.electronAPI?.installer?.selectDirectory) {
      const selected = await window.electronAPI.installer.selectDirectory();
      if (selected) {
        handleTargetPathChange(selected);
      }
    }
  };

  const handleStartInstall = async () => {
    setInstallState('installing');
    setProgress(8);
    setStatusMessage(isUpgrade ? '正在准备覆盖更新...' : '正在初始化安装目录...');

    if (window.electronAPI?.installer?.startInstall) {
      try {
        const result = await window.electronAPI.installer.startInstall({
          targetDir: targetPath,
          createDesktopShortcut,
        });

        if (result.success) {
          setProgress(100);
          setStatusMessage('安装完成');
          setTimeout(() => {
            setInstallState('completed');
          }, 300);
        } else {
          setInstallState('error');
          setErrorMessage(result.error || '安装过程中发生未知错误');
        }
      } catch (err: any) {
        setInstallState('error');
        setErrorMessage(err?.message || '安装过程中发生异常');
      }
    } else {
      const steps = [
        { pct: 25, msg: '正在极速释放核心组件...' },
        { pct: 60, msg: '正在部署渲染引擎...' },
        { pct: 90, msg: '正在写入快捷方式与 .md 关联...' },
        { pct: 100, msg: '安装完成' },
      ];
      for (const s of steps) {
        await new Promise((r) => setTimeout(r, 400));
        setProgress(s.pct);
        setStatusMessage(s.msg);
      }
      setTimeout(() => setInstallState('completed'), 300);
    }
  };

  const handleLaunchApp = () => {
    if (window.electronAPI?.installer?.launchApp) {
      window.electronAPI.installer.launchApp(targetPath);
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  const handleMinimize = () => {
    window.electronAPI?.installer?.minimize?.() ?? window.electronAPI?.minimize?.();
  };

  const handleClose = () => {
    window.electronAPI?.installer?.close?.() ?? window.electronAPI?.close?.();
  };

  return (
    <div className="w-[800px] h-[500px] bg-[#121318] text-zinc-100 rounded-2xl border border-zinc-700/60 shadow-[0_32px_90px_rgba(0,0,0,0.75)] flex flex-col select-none overflow-hidden font-sans relative">
      {/* Subtle Top Spotlight */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[240px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Minimal Floating Top Chrome */}
      <div
        className="relative z-20 h-12 px-5 flex items-center justify-between shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <span className="text-[11px] font-mono text-zinc-600 tracking-wider">MarkForge · {CURRENT_APP_VERSION}</span>

        <div
          className="flex items-center gap-1 -mr-1"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            title="最小化"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-600/85 hover:text-white text-zinc-500 transition-colors cursor-pointer"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Unified Centered Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-12 pb-8 pt-2">
        {installState === 'ready' && (
          <div className="w-full max-w-[580px] flex-1 flex flex-col items-center justify-between">
            <div className="my-auto flex flex-col items-center text-center">
              <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-br from-[#1d2230] to-[#0e1017] border border-sky-400/35 shadow-[0_16px_38px_rgba(0,0,0,0.65),0_0_30px_rgba(56,189,248,0.16)] flex items-center justify-center mb-5">
                <span className="text-4xl font-black bg-gradient-to-br from-sky-300 via-sky-400 to-blue-500 bg-clip-text text-transparent font-mono">
                  M
                </span>
              </div>
              <h1 className="text-[26px] font-bold text-white tracking-tight">MarkForge</h1>
              <p className={`text-xs mt-1.5 tracking-wide ${isUpgrade ? 'text-sky-400 font-medium' : 'text-zinc-400'}`}>
                {isUpgrade ? '检测到已安装版本，点击下方按钮直接原位覆盖升级' : '墨拓笔记 · 极简 Markdown 桌面工作台'}
              </p>
              <button
                onClick={handleStartInstall}
                className="mt-8 w-[280px] h-11 rounded-xl font-semibold text-sm text-white tracking-widest bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_8px_26px_rgba(14,165,233,0.28)] hover:shadow-[0_8px_32px_rgba(14,165,233,0.45)] active:scale-[0.985] transition-all cursor-pointer"
              >
                {isUpgrade ? '覆 盖 更 新' : '立 即 安 装'}
              </button>
            </div>

            <div className="w-full flex flex-col gap-3">
              {isCustomOpen && (
                <div className="w-full p-3 rounded-xl bg-[#181a22] border border-zinc-800/90 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={targetPath}
                      onChange={(e) => handleTargetPathChange(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0d0e13] border border-zinc-800 focus:border-sky-500/70 outline-none text-xs text-zinc-200 font-mono truncate"
                    />
                    <button
                      type="button"
                      onClick={handleSelectDirectory}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/70 transition-colors cursor-pointer shrink-0"
                    >
                      浏览
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-0.5 text-[11px] text-zinc-500">
                    <span>{isUpgrade ? '原位更新模式 · 保留所有文档与个人数据' : '需约 255 MB 磁盘空间'}</span>
                    <span className="text-emerald-400/80">准备就绪</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setCreateDesktopShortcut(!createDesktopShortcut)}
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                      createDesktopShortcut
                        ? 'bg-sky-500 border-sky-400'
                        : 'bg-zinc-800 border-zinc-600'
                    }`}
                  >
                    {createDesktopShortcut && <Check size={10} className="text-white stroke-[3]" />}
                  </div>
                  <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    创建桌面快捷方式并关联 .md
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCustomOpen(!isCustomOpen)}
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-sky-400 transition-colors cursor-pointer"
                >
                  <span>自定义目录</span>
                  {isCustomOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {installState === 'installing' && (
          <div className="w-full max-w-[460px] flex-1 flex flex-col items-center justify-center">
            <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-br from-[#1d2230] to-[#0e1017] border border-sky-400/40 shadow-[0_14px_34px_rgba(0,0,0,0.6),0_0_28px_rgba(56,189,248,0.2)] flex items-center justify-center mb-6">
              <span className="text-4xl font-black bg-gradient-to-br from-sky-300 via-sky-400 to-blue-500 bg-clip-text text-transparent font-mono">
                M
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isUpgrade ? '正在覆盖更新...' : '正在安装...'}
            </h2>

            <div className="w-full mt-10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono truncate max-w-[330px]">{statusMessage}</span>
                <span className="text-sky-400 font-mono font-semibold tabular-nums">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-200"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-600 font-mono text-center truncate pt-1">
                {targetPath}
              </div>
            </div>
          </div>
        )}

        {installState === 'completed' && (
          <div className="w-full max-w-[520px] flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-br from-[#1d2230] to-[#0e1017] border border-emerald-400/40 shadow-[0_16px_38px_rgba(0,0,0,0.65),0_0_30px_rgba(16,185,129,0.16)] flex items-center justify-center text-emerald-400 mb-5">
              <Check size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-[24px] font-bold text-white tracking-tight">
              {isUpgrade ? '更新完成' : '安装完成'}
            </h2>
            {isUpgrade && (
              <p className="text-xs text-emerald-400/90 mt-1 font-medium">
                已成功覆盖升级至最新版本，数据及配置已完整保留
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-1 max-w-[440px] truncate font-mono">
              {targetPath}
            </p>
            <button
              onClick={handleLaunchApp}
              className="mt-8 w-[280px] h-11 rounded-xl font-semibold text-sm text-white tracking-widest bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_8px_26px_rgba(14,165,233,0.28)] hover:shadow-[0_8px_32px_rgba(14,165,233,0.45)] active:scale-[0.985] transition-all cursor-pointer"
            >
              立即开启
            </button>
          </div>
        )}

        {installState === 'error' && (
          <div className="w-full max-w-[460px] flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-[76px] h-[76px] rounded-[22px] bg-gradient-to-br from-[#1d2230] to-[#0e1017] border border-red-500/40 flex items-center justify-center text-red-400 mb-5">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">安装遇到问题</h2>
            <p className="text-xs text-red-400/90 mt-2 leading-relaxed">
              {errorMessage || '安装过程中遭遇权限限制或磁盘读写错误。'}
            </p>
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setInstallState('ready')}
                className="px-6 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
              >
                返回修改
              </button>
              <button
                onClick={handleStartInstall}
                className="px-6 h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium cursor-pointer"
              >
                重试安装
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
