/**
 * @file src/hooks/editor/useCodeBlockSync.ts
 * @description 在 IR 与 WYSIWYG 模式下实时同步代码块的 highlight.js 语法着色、行号与横向滚动位置
 * @module 编辑器核心 Hook
 */
import { useEffect, RefObject } from 'react';

const SPECIAL_CODE_LANGS = new Set([
  'mermaid', 'echarts', 'mindmap', 'plantuml', 'flowchart',
  'graphviz', 'wavedrom', 'smiles', 'markmap', 'abc', 'math',
]);

/**
 * Synchronizes real-time highlight.js syntax highlighting, line numbers,
 * and horizontal scroll between Vditor's editable code block and preview overlay
 * across both IR and WYSIWYG modes.
 */
export function useCodeBlockSync(
  editorRef: RefObject<HTMLDivElement>,
  isReady: boolean,
  theme: 'light' | 'dark'
) {
  useEffect(() => {
    const container = editorRef.current;
    if (!isReady || !container) return;

    let isSyncing = false;

    const getCodeBlockLanguage = (blockEl: HTMLElement): string => {
      const infoEl = blockEl.querySelector('[data-type="code-block-info"]');
      if (infoEl) {
        const raw = (infoEl.textContent || '').replace(/\u200B/g, '').trim().toLowerCase();
        if (raw) return raw;
      }
      const codeEl = blockEl.querySelector('pre > code') as HTMLElement | null;
      if (codeEl) {
        const match = codeEl.className.match(/language-([^\s]+)/i);
        if (match && match[1]) return match[1].toLowerCase();
      }
      return '';
    };

    const syncSingleCodeBlock = (blockEl: HTMLElement) => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const isWysiwyg = blockEl.classList.contains('vditor-wysiwyg__block');
        const lang = getCodeBlockLanguage(blockEl);

        if (SPECIAL_CODE_LANGS.has(lang)) {
          blockEl.classList.add('mf-code-special');
          if (isWysiwyg) blockEl.removeAttribute('data-code-lang');
          return;
        }

        blockEl.classList.remove('mf-code-special');
        if (isWysiwyg) {
          blockEl.setAttribute('data-code-lang', lang || 'text');
        }

        const editCode = isWysiwyg
          ? (blockEl.querySelector(':scope > pre:first-child > code') as HTMLElement | null)
          : (blockEl.querySelector(':scope > pre.vditor-ir__marker--pre > code') as HTMLElement | null);
        const previewWrap = isWysiwyg
          ? (blockEl.querySelector(':scope > pre.vditor-wysiwyg__preview') as HTMLElement | null)
          : (blockEl.querySelector(':scope > .vditor-ir__preview') as HTMLElement | null);

        if (!editCode || !previewWrap) return;

        let previewCode = previewWrap.querySelector(':scope > code') as HTMLElement | null;
        if (!previewCode) {
          previewCode = previewWrap.querySelector(':scope > pre > code') as HTMLElement | null;
        }
        if (!previewCode) {
          previewCode = document.createElement('code');
          previewWrap.appendChild(previewCode);
        }

        let rawText = editCode.textContent || '';
        const lastNode = editCode.lastChild;
        if (lastNode && lastNode.nodeType === Node.ELEMENT_NODE && (lastNode as HTMLElement).tagName === 'BR') {
          if (!rawText.endsWith('\n\n')) {
            rawText += '\n';
          }
        }

        const hljs = (window as any).hljs;
        if (hljs) {
          const validLang = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
          const highlighted = hljs.highlight(rawText, { language: validLang, ignoreIllegals: true }).value;
          const parts = rawText.split(/\r\n|\r|\n/);
          if (rawText.endsWith('\n') && parts.length > 1) {
            parts.pop();
          }
          const lineCount = Math.max(1, parts.length);
          const rowsHtml = `<span class="vditor-linenumber__rows">${'<span></span>'.repeat(lineCount)}</span>`;
          previewCode.className = `language-${lang || 'plaintext'} hljs vditor-linenumber`;
          previewCode.innerHTML = highlighted + rowsHtml;
        }
        previewCode.scrollLeft = editCode.scrollLeft;
      } finally {
        isSyncing = false;
      }
    };

    const syncAllCodeBlocks = () => {
      container.querySelectorAll<HTMLElement>('[data-type="code-block"]').forEach(syncSingleCodeBlock);
    };

    const handleCodeEvent = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const blockEl = target?.closest?.('[data-type="code-block"]') as HTMLElement | null;
      if (blockEl) syncSingleCodeBlock(blockEl);
    };

    const handleCodeScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'CODE') return;
      const blockEl = target.closest('[data-type="code-block"]') as HTMLElement | null;
      if (!blockEl || blockEl.classList.contains('mf-code-special')) return;
      const isWysiwyg = blockEl.classList.contains('vditor-wysiwyg__block');
      const previewCode = isWysiwyg
        ? (blockEl.querySelector(':scope > pre.vditor-wysiwyg__preview > code') as HTMLElement | null)
        : (blockEl.querySelector(':scope > .vditor-ir__preview > code') as HTMLElement | null);
      if (previewCode && previewCode !== target) {
        previewCode.scrollLeft = target.scrollLeft;
      }
    };

    const events = ['input', 'keyup', 'compositionupdate', 'compositionend', 'focusin'];
    events.forEach(ev => container.addEventListener(ev, handleCodeEvent, true));
    container.addEventListener('scroll', handleCodeScroll, true);

    let rafId: number | null = null;
    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncAllCodeBlocks();
      });
    };

    const observer = new MutationObserver((mutations) => {
      if (isSyncing) return;
      const touched = mutations.some(m => {
        const node = m.target as HTMLElement;
        return !node?.closest?.('.vditor-ir__preview, .vditor-wysiwyg__preview');
      });
      if (touched) scheduleSync();
    });

    const irEl = container.querySelector('.vditor-ir');
    const wysiwygEl = container.querySelector('.vditor-wysiwyg');
    const observeOpts = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] };
    if (irEl) observer.observe(irEl, observeOpts);
    if (wysiwygEl) observer.observe(wysiwygEl, observeOpts);

    syncAllCodeBlocks();
    let pollCount = 0;
    const hljsPoll = setInterval(() => {
      pollCount++;
      if ((window as any).hljs) {
        syncAllCodeBlocks();
        clearInterval(hljsPoll);
      } else if (pollCount > 25) {
        clearInterval(hljsPoll);
      }
    }, 120);

    return () => {
      clearInterval(hljsPoll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      events.forEach(ev => container.removeEventListener(ev, handleCodeEvent, true));
      container.removeEventListener('scroll', handleCodeScroll, true);
    };
  }, [editorRef, isReady, theme]);
}
