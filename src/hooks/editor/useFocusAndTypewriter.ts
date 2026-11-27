/**
 * @file src/hooks/editor/useFocusAndTypewriter.ts
 * @description 实现编辑器专注模式（当前块高亮聚焦）与打字机模式（光标自动垂直居中滚动）
 * @module 编辑器核心 Hook
 */
import { useEffect, RefObject } from 'react';

/**
 * Enables Focus Mode (dimming sibling blocks via `.vditor-focus-block`)
 * and Typewriter Mode (keeping the active cursor vertically centered).
 * Attaches zero listeners when neither mode is active.
 */
export function useFocusAndTypewriter(
  editorRef: RefObject<HTMLDivElement>,
  isReady: boolean,
  isTypewriterMode?: boolean,
  isFocusMode?: boolean
) {
  useEffect(() => {
    if (!isReady || !editorRef.current || (!isTypewriterMode && !isFocusMode)) return;
    const resetEl = Array.from(editorRef.current.querySelectorAll<HTMLElement>('.vditor-reset')).find(
      el => el.clientHeight > 0
    ) || (editorRef.current.querySelector('.vditor-reset') as HTMLElement | null);
    if (!resetEl) return;

    let rafId: number | null = null;
    const handleFocusAndTypewriter = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const node = sel.anchorNode;
        if (!node || !resetEl.contains(node)) return;

        if (isFocusMode) {
          let block = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null;
          while (block && block.parentElement !== resetEl) {
            block = block.parentElement;
          }
          if (block) {
            resetEl.querySelectorAll('.vditor-focus-block').forEach(p => {
              if (p !== block) p.classList.remove('vditor-focus-block');
            });
            block.classList.add('vditor-focus-block');
          }
        }

        if (isTypewriterMode) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const editorContent = editorRef.current?.querySelector('.vditor-content') as HTMLElement | null;
          if (editorContent && rect.top > 0) {
            const containerRect = editorContent.getBoundingClientRect();
            const targetY = containerRect.top + containerRect.height / 2;
            const diff = rect.top - targetY;
            if (Math.abs(diff) > 25) {
              editorContent.scrollBy({ top: diff, behavior: 'smooth' });
            }
          }
        }
      });
    };

    document.addEventListener('selectionchange', handleFocusAndTypewriter);
    resetEl.addEventListener('input', handleFocusAndTypewriter);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('selectionchange', handleFocusAndTypewriter);
      resetEl.removeEventListener('input', handleFocusAndTypewriter);
    };
  }, [editorRef, isReady, isTypewriterMode, isFocusMode]);
}
