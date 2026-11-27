/**
 * @file src/hooks/useTabs.ts
 * @description 管理多文档标签页增删切换、本地文件 1.5s 防抖自动保存、系统外部文件打开监听及未保存关闭确认流
 * @module 标签页与文件状态 Hook
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { TabItem } from '../components/Tabs';
import { DEFAULT_WELCOME_DOC } from '../constants/welcomeDoc';

interface UseTabsOptions {
  onRefreshFolder?: () => void;
}

/**
 * Manages open editor tabs, local auto-save, system "Open with" events,
 * and unsaved-changes close confirmation flow.
 */
export function useTabs({ onRefreshFolder }: UseTabsOptions = {}) {
  const [tabs, setTabs] = useState<TabItem[]>([
    {
      id: 'tab-welcome',
      name: '欢迎使用.md',
      content: DEFAULT_WELCOME_DOC,
      isDirty: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-welcome');
  const [pendingClose, setPendingClose] = useState<{ type: 'tab' | 'app'; tabId: string } | null>(null);

  const onRefreshFolderRef = useRef(onRefreshFolder);
  onRefreshFolderRef.current = onRefreshFolder;

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const pendingTab = pendingClose ? tabs.find(t => t.id === pendingClose.tabId) : null;

  // Auto-save debounce for opened local files
  useEffect(() => {
    if (!activeTab || !activeTab.path || !activeTab.isDirty) return;
    const timer = setTimeout(async () => {
      try {
        await window.electronAPI?.writeFile(activeTab.path!, activeTab.content);
        setTabs(prev =>
          prev.map(t => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
        );
      } catch (err) {
        console.error('Auto save failed:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeTab?.content, activeTab?.isDirty, activeTab?.path]);

  const handleScrollChange = useCallback((scrollTop: number) => {
    setTabs(prev =>
      prev.map(t => (t.id === activeTabId ? { ...t, scrollTop } : t))
    );
  }, [activeTabId]);

  const handleContentChange = useCallback((newContent: string) => {
    setTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, content: newContent, isDirty: true } : tab
      )
    );
  }, [activeTabId]);

  const handleSelectTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const doCloseTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length <= 1) {
        const newTab: TabItem = {
          id: `tab-${Date.now()}`,
          name: '未命名.md',
          content: '# 新建文档\n\n在此输入正文内容...\n',
          isDirty: false,
        };
        setActiveTabId(newTab.id);
        return [newTab];
      }

      const filtered = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        const currentIndex = prev.findIndex(t => t.id === id);
        const nextTab = filtered[Math.min(currentIndex, filtered.length - 1)];
        setActiveTabId(nextTab.id);
      }
      return filtered;
    });
  }, [activeTabId]);

  const handleCloseTab = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetTab = tabs.find(t => t.id === id);
    if (!targetTab) return;

    if (targetTab.isDirty) {
      setActiveTabId(id);
      setPendingClose({ type: 'tab', tabId: id });
      return;
    }

    doCloseTab(id);
  }, [tabs, doCloseTab]);

  const handleNewTab = useCallback(() => {
    setTabs(prev => {
      const newTab: TabItem = {
        id: `tab-${Date.now()}`,
        name: `未命名-${prev.length + 1}.md`,
        content: '# 新文档\n\n在此输入正文内容...\n',
        isDirty: false,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const handleOpenFile = useCallback(async () => {
    const res = await window.electronAPI?.openFile();
    if (!res) return;

    setTabs(prev => {
      const existing = prev.find(t => t.path === res.path);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const newTab: TabItem = {
        id: `tab-${Date.now()}`,
        name: res.name,
        path: res.path,
        content: res.content,
        isDirty: false,
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const handleSaveFileAs = useCallback(async () => {
    if (!activeTab) return;
    const res = await window.electronAPI?.saveFileAs(activeTab.name, activeTab.content);
    if (res) {
      setTabs(prev =>
        prev.map(t =>
          t.id === activeTab.id
            ? { ...t, path: res.path, name: res.name, isDirty: false }
            : t
        )
      );
      onRefreshFolderRef.current?.();
    }
  }, [activeTab]);

  const handleSaveFile = useCallback(async () => {
    if (!activeTab) return;

    if (activeTab.path) {
      await window.electronAPI?.writeFile(activeTab.path, activeTab.content);
      setTabs(prev =>
        prev.map(t => (t.id === activeTab.id ? { ...t, isDirty: false } : t))
      );
    } else {
      await handleSaveFileAs();
    }
  }, [activeTab, handleSaveFileAs]);

  const openFileByPath = useCallback(async (filePath: string) => {
    try {
      const cleanPath = filePath.trim();
      if (!cleanPath) return;

      const content = await window.electronAPI?.readFile(cleanPath);
      if (content === undefined) return;

      const fileName = cleanPath.split(/[/\\]/).pop() || '未命名.md';
      const newTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newTab: TabItem = {
        id: newTabId,
        name: fileName,
        path: cleanPath,
        content,
        isDirty: false,
      };

      setTabs(prev => {
        const existing = prev.find(t => t.path && t.path.toLowerCase() === cleanPath.toLowerCase());
        if (existing) {
          setActiveTabId(existing.id);
          return prev;
        }
        // Replace pristine welcome tab directly so external open shows user's file right away
        if (prev.length === 1 && prev[0].name === '欢迎使用.md' && !prev[0].path && !prev[0].isDirty) {
          setActiveTabId(newTabId);
          return [newTab];
        }
        setActiveTabId(newTabId);
        return [...prev, newTab];
      });
    } catch (err) {
      console.error('Failed to open file from system:', err);
    }
  }, []);

  // Listen to external OS "Open with" or cold start file arguments
  useEffect(() => {
    window.electronAPI?.getInitialFile?.().then(filePath => {
      if (filePath) openFileByPath(filePath);
    });

    const cleanup = window.electronAPI?.onFileOpenedFromSystem?.(filePath => {
      if (filePath) openFileByPath(filePath);
    });

    return () => {
      cleanup?.();
    };
  }, [openFileByPath]);

  const handleTryCloseApp = useCallback(() => {
    const dirtyTab = tabs.find(t => t.isDirty);
    if (dirtyTab) {
      setActiveTabId(dirtyTab.id);
      setPendingClose({ type: 'app', tabId: dirtyTab.id });
    } else if (window.electronAPI?.forceClose) {
      window.electronAPI.forceClose();
    } else {
      window.close();
    }
  }, [tabs]);

  useEffect(() => {
    if (window.electronAPI?.onTryClose) {
      return window.electronAPI.onTryClose(() => {
        handleTryCloseApp();
      });
    }
  }, [handleTryCloseApp]);

  const advanceAppClose = useCallback((resolvedTabId: string) => {
    const remainingDirtyTabs = tabs.filter(t => t.id !== resolvedTabId && t.isDirty);
    if (remainingDirtyTabs.length > 0) {
      setActiveTabId(remainingDirtyTabs[0].id);
      setPendingClose({ type: 'app', tabId: remainingDirtyTabs[0].id });
    } else {
      setPendingClose(null);
      if (window.electronAPI?.forceClose) {
        window.electronAPI.forceClose();
      } else {
        window.close();
      }
    }
  }, [tabs]);

  const handleModalCancel = useCallback(() => {
    setPendingClose(null);
  }, []);

  const handleModalDiscard = useCallback(() => {
    if (!pendingClose) return;
    const currentTabId = pendingClose.tabId;

    if (pendingClose.type === 'tab') {
      setPendingClose(null);
      doCloseTab(currentTabId);
    } else {
      setTabs(prev => prev.map(t => (t.id === currentTabId ? { ...t, isDirty: false } : t)));
      advanceAppClose(currentTabId);
    }
  }, [pendingClose, doCloseTab, advanceAppClose]);

  const handleModalSave = useCallback(async () => {
    if (!pendingClose) return;
    const currentTabId = pendingClose.tabId;
    const targetTab = tabs.find(t => t.id === currentTabId);
    if (!targetTab) {
      setPendingClose(null);
      return;
    }

    let saveSuccess = false;
    let savedPath = targetTab.path;
    let savedName = targetTab.name;

    if (targetTab.path) {
      const ok = await window.electronAPI?.writeFile(targetTab.path, targetTab.content);
      if (ok !== false) saveSuccess = true;
    } else {
      const res = await window.electronAPI?.saveFileAs(targetTab.name, targetTab.content);
      if (res) {
        saveSuccess = true;
        savedPath = res.path;
        savedName = res.name;
        onRefreshFolderRef.current?.();
      }
    }

    if (!saveSuccess) return;

    setTabs(prev =>
      prev.map(t => (t.id === currentTabId ? { ...t, path: savedPath, name: savedName, isDirty: false } : t))
    );

    if (pendingClose.type === 'tab') {
      setPendingClose(null);
      doCloseTab(currentTabId);
    } else {
      advanceAppClose(currentTabId);
    }
  }, [pendingClose, tabs, doCloseTab, advanceAppClose]);

  return {
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
  };
}
