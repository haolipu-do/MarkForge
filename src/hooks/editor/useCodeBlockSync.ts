/**
 * @file src/hooks/editor/useCodeBlockSync.ts
 * @description 在 IR 与 WYSIWYG 模式下使用可视区懒渲染与局部脏块同步机制实时着色代码块与行号
 * @module 编辑器核心 Hook
 */
import { useEffect, RefObject } from 'react';

const SPECIAL_CODE_LANGS = new Set([
  'mermaid', 'echarts', 'mindmap', 'plantuml', 'flowchart',
  'graphviz', 'wavedrom', 'smiles', 'markmap', 'abc', 'math',
]);

function fastHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Lazily synchronizes highlight.js syntax highlighting, line numbers, and horizontal scroll
 * only for visible/nearby code blocks (`IntersectionObserver`) and mutated dirty blocks,
 * preventing main-thread freezes on huge multi-hundred-kilobyte documents.
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
    const syncedSignatures = new WeakMap<HTMLElement, string>();
    const observedBlocks = new WeakSet<HTMLElement>();
    const dirtyBlocks = new Set<HTMLElement>();
    let rafId: number | null = null;

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

    const syncSingleCodeBlock = (blockEl: HTMLElement, force = false) => {
      if (isSyncing || !blockEl.isConnected) return;
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
        const sig = `${theme}:${lang}:${rawText.length}:${fastHash(rawText)}:${Boolean(hljs)}`;
        if (!force && syncedSignatures.get(blockEl) === sig && previewCode.childElementCount > 0) {
          return;
        }

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
          syncedSignatures.set(blockEl, sig);
        }
        previewCode.scrollLeft = editCode.scrollLeft;
      } finally {
        isSyncing = false;
      }
    };

    // Lazily highlight code blocks only when near or inside the viewport
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            syncSingleCodeBlock(entry.target as HTMLElement);
          }
        }
      },
      { rootMargin: '800px 0px' }
    );

    const registerCodeBlocks = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>('[data-type="code-block"]').forEach((blockEl) => {
        if (!observedBlocks.has(blockEl)) {
          observedBlocks.add(blockEl);
          intersectionObserver.observe(blockEl);
        }
      });
    };

    const flushDirtyBlocks = () => {
      rafId = null;
      dirtyBlocks.forEach((blockEl) => syncSingleCodeBlock(blockEl));
      dirtyBlocks.clear();
    };

    const queueDirtyBlock = (blockEl: HTMLElement | null) => {
      if (!blockEl) return;
      if (!observedBlocks.has(blockEl)) {
        observedBlocks.add(blockEl);
        intersectionObserver.observe(blockEl);
      }
      dirtyBlocks.add(blockEl);
      if (rafId === null) {
        rafId = requestAnimationFrame(flushDirtyBlocks);
      }
    };

    const handleCodeEvent = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const blockEl = target?.closest?.('[data-type="code-block"]') as HTMLElement | null;
      if (blockEl) syncSingleCodeBlock(blockEl, true);
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

    const observer = new MutationObserver((mutations) => {
      if (isSyncing) return;
      for (const m of mutations) {
        const node = m.target as HTMLElement | null;
        if (!node || node?.closest?.('.vditor-ir__preview, .vditor-wysiwyg__preview')) continue;
        const blockEl = node?.closest?.('[data-type="code-block"]') as HTMLElement | null;
        if (blockEl) {
          queueDirtyBlock(blockEl);
        } else if (m.addedNodes.length > 0) {
          m.addedNodes.forEach((added) => {
            if (added.nodeType === Node.ELEMENT_NODE) {
              const el = added as HTMLElement;
              if (el.getAttribute('data-type') === 'code-block') {
                queueDirtyBlock(el);
              } else if (el.querySelector('[data-type="code-block"]')) {
                registerCodeBlocks(el);
              }
            }
          });
        }
      }
    });

    const irEl = container.querySelector('.vditor-ir');
    const wysiwygEl = container.querySelector('.vditor-wysiwyg');
    const observeOpts = { childList: true, subtree: true, characterData: true };
    if (irEl) observer.observe(irEl, observeOpts);
    if (wysiwygEl) observer.observe(wysiwygEl, observeOpts);

    registerCodeBlocks(container);

    let pollCount = 0;
    const hljsPoll = setInterval(() => {
      pollCount++;
      if ((window as any).hljs) {
        // Re-trigger IntersectionObserver asynchronously without querying getBoundingClientRect on all blocks
        intersectionObserver.disconnect();
        container.querySelectorAll<HTMLElement>('[data-type="code-block"]').forEach((blockEl) => {
          intersectionObserver.observe(blockEl);
        });
        clearInterval(hljsPoll);
      } else if (pollCount > 25) {
        clearInterval(hljsPoll);
      }
    }, 120);

    return () => {
      clearInterval(hljsPoll);
      if (rafId !== null) cancelAnimationFrame(rafId);
      intersectionObserver.disconnect();
      observer.disconnect();
      events.forEach(ev => container.removeEventListener(ev, handleCodeEvent, true));
      container.removeEventListener('scroll', handleCodeScroll, true);
    };
  }, [editorRef, isReady, theme]);
}
