/**
 * @file src/hooks/editor/useEditorFindReplace.ts
 * @description 管理编辑器内查找替换工具条状态、全局检索唤醒事件监听与全文正则批量替换逻辑
 * @module 编辑器核心 Hook
 */
import { useState, useEffect, useCallback, MutableRefObject } from 'react';
import Vditor from 'vditor';

interface FindBarState {
  isOpen: boolean;
  initialQuery?: string;
  showReplace: boolean;
  focusTrigger: number;
}

/** Manages in-editor find & replace bar state, shortcut trigger events, and batch replace actions. */
export function useEditorFindReplace(
  vditorInstance: MutableRefObject<Vditor | null>,
  getActiveEditorReset: () => HTMLElement | null,
  onChange: (value: string) => void
) {
  const [findBarState, setFindBarState] = useState<FindBarState>({
    isOpen: false,
    showReplace: false,
    focusTrigger: 0,
  });

  useEffect(() => {
    const onEditorFind = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail || {};
      setFindBarState({
        isOpen: true,
        initialQuery: detail.query || undefined,
        showReplace: Boolean(detail.showReplace),
        focusTrigger: Date.now(),
      });
    };
    window.addEventListener('markforge-editor-find', onEditorFind);
    return () => window.removeEventListener('markforge-editor-find', onEditorFind);
  }, []);

  const openFindBar = useCallback((initialQuery?: string, showReplace = false) => {
    setFindBarState({
      isOpen: true,
      initialQuery: initialQuery || undefined,
      showReplace,
      focusTrigger: Date.now(),
    });
  }, []);

  const closeFindBar = useCallback(() => {
    setFindBarState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleReplaceAllInEditor = useCallback(
    (queryStr: string, replacement: string, caseSensitive: boolean): number => {
      if (!vditorInstance.current || !queryStr) return 0;
      const currentVal = vditorInstance.current.getValue();
      const escaped = queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
      const matches = currentVal.match(regex);
      if (!matches || matches.length === 0) return 0;

      const activeReset = getActiveEditorReset();
      const savedScroll = activeReset ? activeReset.scrollTop : 0;
      const nextVal = currentVal.replace(regex, () => replacement);
      vditorInstance.current.setValue(nextVal);
      onChange(nextVal);
      if (activeReset) {
        requestAnimationFrame(() => {
          activeReset.scrollTop = savedScroll;
        });
      }
      return matches.length;
    },
    [vditorInstance, getActiveEditorReset, onChange]
  );

  const handleSyncAfterReplace = useCallback(() => {
    if (!vditorInstance.current) return;
    onChange(vditorInstance.current.getValue());
  }, [vditorInstance, onChange]);

  return {
    findBarState,
    openFindBar,
    closeFindBar,
    handleReplaceAllInEditor,
    handleSyncAfterReplace,
  };
}
