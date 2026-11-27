/**
 * @file src/App.tsx
 * @description 应用主界面容器，编排顶部标题栏、侧边栏、标签页、核心编辑器、状态栏、幻灯片演示及全局模态框
 * @module 应用主框架模块
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2 } from 'lucide-react';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { Sidebar } from './components/Sidebar';
import { Editor, EditorMode } from './components/Editor';
import { SlideViewer } from './components/SlideViewer';
import { StatusBar } from './components/StatusBar';
import { Installer } from './components/Installer';
import { SaveConfirmModal } from './components/SaveConfirmModal';
import { QuickOpenModal } from './components/QuickOpenModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ReleaseNotesModal } from './components/ReleaseNotesModal';
import { AboutModal } from './components/AboutModal';
import { FileActionModal } from './components/FileActionModal';
import { useTabs } from './hooks/useTabs';
import { useWorkspace } from './hooks/useWorkspace';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

export const App: React.FC = () => {
  const [isInstaller, setIsInstaller] = useState(() => window.location.hash.includes('installer'));

  useEffect(() => {
    window.electronAPI?.installer?.isInstallerMode?.().then((mode) => {
      if (mode) setIsInstaller(true);
    });
  }, []);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('markforge-theme') as 'light' | 'dark') || 'dark';
  });

  // Layout & UI state
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSlideMode, setIsSlideMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [lineEnding, setLineEnding] = useState<'CRLF' | 'LF'>('CRLF');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'outline' | 'search'>('files');
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('wysiwyg');
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 1 });
  const [, setHeadings] = useState<{ level: number; text: string; id: string }[]>([]);

  // Decoupled Tabs & Workspace hooks (linked cleanly via ref to avoid circular deps)
  const refreshFolderRef = useRef<() => void>();
  const {
    tabs,
    setTabs,
    activeTabId,
    activeTab,
    pendingClose,
    pendingTab,
    handleScrollChange,
    handleContentChange,
    handleSelectTab,
    handleCloseTab,
    handleNewTab,
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    openFileByPath,
    handleTryCloseApp,
    handleModalCancel,
    handleModalDiscard,
    handleModalSave,
  } = useTabs({ onRefreshFolder: () => refreshFolderRef.current?.() });

  const {
    folderPath,
    fileTree,
    fileActionState,
    closeFileActionModal,
    handleRefreshFolder,
    handleOpenFolder,
    handleOpenFileFromTree,
    handleCreateFileInFolder,
    handleCreateFolderInDir,
    handleDeleteItem,
    handleRenameItem,
    handleFileActionConfirm,
  } = useWorkspace({ openFileByPath, setTabs, setSidebarOpen });

  refreshFolderRef.current = handleRefreshFolder;

  // Sync DevTools state from Electron main process
  useEffect(() => {
    window.electronAPI?.isDevToolsOpened?.().then(open => {
      if (typeof open === 'boolean') setIsDevToolsOpen(open);
    });
    const cleanup = window.electronAPI?.onDevToolsChanged?.((open) => {
      setIsDevToolsOpen(open);
    });
    return () => cleanup?.();
  }, []);

  // Local Search event listener from Editor context menu
  useEffect(() => {
    const handleLocalSearch = () => {
      setSidebarOpen(true);
      setSidebarTab('search');
      setSearchFocusTrigger(Date.now());
    };
    window.addEventListener('markforge-local-search', handleLocalSearch);
    return () => window.removeEventListener('markforge-local-search', handleLocalSearch);
  }, []);

  const handleSetEditorMode = useCallback((mode: EditorMode) => {
    setEditorMode(mode);
    window.dispatchEvent(new CustomEvent('markforge-set-editor-mode', { detail: { mode } }));
  }, []);

  const handleToggleSourceMode = useCallback(() => {
    window.dispatchEvent(new CustomEvent('markforge-set-editor-mode', { detail: { mode: 'toggle-source' } }));
  }, []);

  const handleToggleDevTools = useCallback(async () => {
    const res = await window.electronAPI?.toggleDevTools?.();
    if (typeof res === 'boolean') setIsDevToolsOpen(res);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('markforge-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  }, []);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    const res = await window.electronAPI?.setAlwaysOnTop(!isAlwaysOnTop);
    if (typeof res === 'boolean') setIsAlwaysOnTop(res);
    else setIsAlwaysOnTop(prev => !prev);
  }, [isAlwaysOnTop]);

  const handleOpenOutline = useCallback(() => {
    setSidebarOpen(true);
    setSidebarTab('outline');
  }, []);

  const handleRevealInExplorer = useCallback(() => {
    if (activeTab?.path) window.electronAPI?.showItemInFolder(activeTab.path);
    else if (folderPath) window.electronAPI?.showItemInFolder(folderPath);
  }, [activeTab?.path, folderPath]);

  const baseDocTitle = activeTab?.name.replace(/\.md$/, '') || '未命名';
  const handleExportPDF = () => activeTab && window.electronAPI?.exportPDF(baseDocTitle);
  const handleExportHTML = () => activeTab && window.electronAPI?.exportHTML(baseDocTitle, activeTab.content);
  const handleExportImage = () => activeTab && window.electronAPI?.exportImage(baseDocTitle);
  const handleExportText = (ext: string) => activeTab && window.electronAPI?.exportText(baseDocTitle, activeTab.content, ext);

  useGlobalShortcuts({
    activeTabId,
    isSlideMode,
    setIsSlideMode,
    isZenMode,
    setIsZenMode,
    setSidebarOpen,
    setSidebarTab,
    setSearchFocusTrigger,
    setIsQuickOpen,
    setIsShortcutsOpen,
    onSaveFile: handleSaveFile,
    onSaveFileAs: handleSaveFileAs,
    onOpenFile: handleOpenFile,
    onOpenFolder: handleOpenFolder,
    onNewTab: handleNewTab,
    onCloseTab: handleCloseTab,
    onToggleTheme: handleToggleTheme,
    onOpenOutline: handleOpenOutline,
    onToggleAlwaysOnTop: handleToggleAlwaysOnTop,
  });

  if (isInstaller) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent select-none p-2">
        <Installer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-canvas)]">
      {!isZenMode && (
        <Header
          currentFileName={activeTab?.name || 'MarkForge'}
          isDirty={!!activeTab?.isDirty}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(prev => !prev)}
          isSlideMode={isSlideMode}
          onToggleSlideMode={() => setIsSlideMode(prev => !prev)}
          isTypewriterMode={isTypewriterMode}
          onToggleTypewriterMode={() => setIsTypewriterMode(prev => !prev)}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
          isAlwaysOnTop={isAlwaysOnTop}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          onNewFile={handleNewTab}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onQuickOpen={() => setIsQuickOpen(true)}
          onSaveFile={handleSaveFile}
          onSaveFileAs={handleSaveFileAs}
          onExportPDF={handleExportPDF}
          onExportHTML={handleExportHTML}
          onExportImage={handleExportImage}
          onExportText={handleExportText}
          onRevealInExplorer={handleRevealInExplorer}
          onOpenOutline={handleOpenOutline}
          onShowShortcuts={() => setIsShortcutsOpen(true)}
          onShowReleaseNotes={() => setIsReleaseNotesOpen(true)}
          onShowAbout={() => setIsAboutOpen(true)}
          onCloseApp={handleTryCloseApp}
          editorMode={editorMode}
          onSetEditorMode={handleSetEditorMode}
          isDevToolsOpen={isDevToolsOpen}
          onToggleDevTools={handleToggleDevTools}
        />
      )}

      {isZenMode && (
        <div className="fixed top-0 right-5 h-[43px] flex items-center z-50 animate-in fade-in duration-200 pointer-events-none">
          <button
            onClick={() => setIsZenMode(false)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 hover:bg-zinc-100 text-sky-700 border border-zinc-300 dark:bg-zinc-800/90 dark:hover:bg-zinc-700 dark:text-sky-400 dark:hover:text-white dark:border-zinc-600 shadow-lg text-xs font-semibold backdrop-blur transition-all hover:scale-105 active:scale-95"
            title="退出禅模式 (按 ESC 或 F11)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>退出禅模式 (ESC)</span>
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!isZenMode && (
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(prev => !prev)}
            folderPath={folderPath}
            fileTree={fileTree}
            onOpenFile={handleOpenFileFromTree}
            onOpenFolder={handleOpenFolder}
            onCreateFile={handleCreateFileInFolder}
            onCreateFolder={handleCreateFolderInDir}
            onDeleteItem={handleDeleteItem}
            onRenameItem={handleRenameItem}
            onRefreshFolder={handleRefreshFolder}
            markdownContent={activeTab?.content || ''}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            searchFocusTrigger={searchFocusTrigger}
          />
        )}

        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
          {!isZenMode && (
            <Tabs
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
              onNewTab={handleNewTab}
            />
          )}

          <div className="flex-1 relative overflow-hidden min-h-0">
            <Editor
              key={activeTabId}
              value={activeTab?.content || ''}
              onChange={handleContentChange}
              theme={theme}
              initialScrollTop={activeTab?.scrollTop || 0}
              onScrollChange={handleScrollChange}
              onStatsChange={setStats}
              onHeadingsChange={setHeadings}
              isTypewriterMode={isTypewriterMode}
              isFocusMode={isFocusMode}
              editorMode={editorMode}
              onEditorModeChange={setEditorMode}
            />
          </div>
        </main>
      </div>

      {!isZenMode && (
        <StatusBar
          stats={stats}
          isSaved={!activeTab?.isDirty}
          lineEnding={lineEnding}
          onToggleLineEnding={() => setLineEnding(prev => (prev === 'CRLF' ? 'LF' : 'CRLF'))}
          isTypewriterMode={isTypewriterMode}
          isFocusMode={isFocusMode}
          isAlwaysOnTop={isAlwaysOnTop}
          onOpenOutline={handleOpenOutline}
          editorMode={editorMode}
          onToggleSourceMode={handleToggleSourceMode}
          isDevToolsOpen={isDevToolsOpen}
          onToggleDevTools={handleToggleDevTools}
        />
      )}

      <SlideViewer
        content={activeTab?.content || ''}
        isOpen={isSlideMode}
        onClose={() => setIsSlideMode(false)}
        theme={theme}
      />

      <QuickOpenModal
        isOpen={isQuickOpen}
        onClose={() => setIsQuickOpen(false)}
        fileTree={fileTree}
        onSelectFile={handleOpenFileFromTree}
        activeFilePath={activeTab?.path}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ReleaseNotesModal isOpen={isReleaseNotesOpen} onClose={() => setIsReleaseNotesOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <SaveConfirmModal
        isOpen={!!pendingClose && !!pendingTab}
        fileName={pendingTab?.name || '未命名.md'}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
      />

      <FileActionModal
        isOpen={fileActionState.isOpen}
        mode={fileActionState.mode}
        targetPath={fileActionState.targetPath}
        defaultName={fileActionState.defaultName}
        itemType={fileActionState.itemType}
        onConfirm={handleFileActionConfirm}
        onClose={closeFileActionModal}
      />
    </div>
  );
};
