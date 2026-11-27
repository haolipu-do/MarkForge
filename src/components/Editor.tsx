/**
 * @file src/components/Editor.tsx
 * @description 基于 Vditor 封装的核心 Markdown 编辑器，负责多视图模式（IR/WYSIWYG/源码/分屏）、工具栏增强与交互编排
 * @module 核心编辑器模块
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Vditor from 'vditor';
import { TableGridPicker } from './TableGridPicker';
import { TableToolbarPopover } from './TableToolbarPopover';
import { ContextMenu } from './ContextMenu';
import { EditorFindBar } from './EditorFindBar';
import { SlashInsertMenu } from './editor/SlashInsertMenu';
import { LinkHoverTooltip, HoverLinkTooltipState } from './editor/LinkHoverTooltip';
import { TableQuickPill } from './editor/TableQuickPill';
import { useCodeBlockSync } from '../hooks/editor/useCodeBlockSync';
import { useFocusAndTypewriter } from '../hooks/editor/useFocusAndTypewriter';
import { useEditorFindReplace } from '../hooks/editor/useEditorFindReplace';
import { extractLinkInfo, scrollToHeadingByAnchor, openExternalLink } from '../utils/linkUtils';
import { dispatchTableAction, dispatchContextMenuCommand, dispatchFormatAction } from '../utils/editorCommandDispatcher';
import { analyzeMarkdownContent } from '../utils/markdownStats';
import {
  TableContext,
  getTableContext,
  handleTableTab,
} from '../utils/tableOperations';

export type EditorMode = 'ir' | 'wysiwyg' | 'source' | 'split';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  initialScrollTop?: number;
  onScrollChange?: (scrollTop: number) => void;
  onStatsChange?: (stats: { words: number; chars: number; readTime: number }) => void;
  onHeadingsChange?: (headings: { level: number; text: string; id: string }[]) => void;
  isTypewriterMode?: boolean;
  isFocusMode?: boolean;
  editorMode?: EditorMode;
  onEditorModeChange?: (mode: EditorMode) => void;
}

const TOOLBAR_TOOLTIPS: Record<string, string> = {
  'headings': '标题 (Ctrl+1~6)',
  'bold': '粗体 (Ctrl+B)',
  'italic': '斜体 (Ctrl+I)',
  'strike': '删除线 (Ctrl+D)',
  'link': '插入超链接 (Ctrl+K)',
  'list': '无序列表 (Ctrl+Shift+U)',
  'ordered-list': '有序列表 (Ctrl+Shift+O)',
  'check': '任务清单 (Ctrl+Shift+C)',
  'outdent': '减少缩进 (Shift+Tab)',
  'indent': '增加缩进 (Tab)',
  'quote': '引用段落 (Ctrl+Shift+Q)',
  'line': '插入分割线 (---)',
  'code': '插入代码块 (Ctrl+Shift+K)',
  'inline-code': '行内代码',
  'table': '插入表格 / 表格工具箱 (Ctrl+T)',
  'undo': '撤销操作 (Ctrl+Z)',
  'redo': '重做操作 (Ctrl+Y)',
  'edit-mode': '视图模式 (即时渲染 / 所见即所得 / 源码模式 Ctrl+/)',
};

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  theme,
  initialScrollTop,
  onScrollChange,
  onStatsChange,
  onHeadingsChange,
  isTypewriterMode,
  isFocusMode,
  editorMode = 'wysiwyg',
  onEditorModeChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const vditorInstance = useRef<Vditor | null>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const isInternalChange = useRef(false);
  const lastEmittedValueRef = useRef<string | null>(null);
  const lastMountedValueRef = useRef<string>(value || '');
  const currentModeRef = useRef<EditorMode>(editorMode);
  const lastRichModeRef = useRef<'ir' | 'wysiwyg'>(editorMode === 'ir' ? 'ir' : 'wysiwyg');

  const getActiveEditorReset = useCallback((): HTMLElement | null => {
    const container = editorRef.current;
    if (!container) return null;
    const ir = container.querySelector<HTMLElement>('.vditor-ir .vditor-reset');
    if (ir && ir.clientHeight > 0) return ir;
    const sv = container.querySelector<HTMLElement>('.vditor-sv');
    if (sv && sv.clientHeight > 0) return sv;
    return Array.from(container.querySelectorAll<HTMLElement>('.vditor-reset')).find(el => el.clientHeight > 0) || null;
  }, []);

  const {
    findBarState,
    openFindBar,
    closeFindBar,
    handleReplaceAllInEditor,
    handleSyncAfterReplace,
  } = useEditorFindReplace(vditorInstance, getActiveEditorReset, onChange);

  // Modern Table System State
  const [showGridPicker, setShowGridPicker] = useState(false);
  const [showTablePopover, setShowTablePopover] = useState(false);
  const [tableContext, setTableContext] = useState<TableContext>({
    inTable: false,
    table: null,
    thead: null,
    tbody: null,
    tr: null,
    cell: null,
    rowIndex: -1,
    bodyRowIndex: -1,
    colIndex: -1,
    isHeader: false,
    totalRows: 0,
    totalCols: 0,
    currentAlign: '',
  });
  const [tableAnchorPos, setTableAnchorPos] = useState<{ top: number; left: number } | null>(null);

  // Modern Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    selectedText: string;
    hasSelection: boolean;
    isInTable: boolean;
    tableContext: TableContext | null;
    targetLink: { href: string; text: string; isInternal?: boolean } | null;
    targetImage: { src: string; alt: string } | null;
  } | null>(null);

  const [hoverLinkTooltip, setHoverLinkTooltip] = useState<HoverLinkTooltipState | null>(null);

  const getTableAnchorPos = useCallback(() => {
    const tableBtn = editorRef.current?.querySelector('.vditor-toolbar button[data-type="table"]') as HTMLElement;
    if (tableBtn) {
      const rect = tableBtn.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 340, Math.max(10, rect.left - 100));
      return { top: rect.bottom + 6, left };
    }
    return { top: 86, left: Math.min(window.innerWidth - 340, 300) };
  }, []);

  const analyzeContent = useCallback((text: string) => {
    const { stats, headings } = analyzeMarkdownContent(text);
    onStatsChange?.(stats);
    onHeadingsChange?.(headings);
  }, [onStatsChange, onHeadingsChange]);

  const executeTableAction = useCallback((action: string, payload?: any) => {
    const vd = vditorInstance.current;
    if (!vd) return;
    dispatchTableAction(action, payload, {
      vditor: vd,
      onUpdate: (val) => {
        onChange(val);
        analyzeContent(val);
      },
      openGridPicker: () => {
        setTableAnchorPos(getTableAnchorPos());
        setShowGridPicker(true);
        setShowTablePopover(false);
      },
      setTableContext,
    });
  }, [onChange, analyzeContent, getTableAnchorPos]);

  const handleExecuteContextMenuCommand = useCallback((command: string, payload?: any) => {
    const vd = vditorInstance.current;
    if (!vd) return;
    dispatchContextMenuCommand(command, payload, {
      vditor: vd,
      editorContainer: editorRef.current,
      selectedText: contextMenu?.selectedText || '',
      openFindBar,
      openGridPicker: () => {
        setTableAnchorPos(getTableAnchorPos());
        setShowGridPicker(true);
      },
      getActiveEditorReset,
      onChange,
      executeTableAction,
    });
  }, [contextMenu, executeTableAction, getTableAnchorPos, openFindBar, getActiveEditorReset, onChange]);

  // Initialize Vditor in user's preferred mode (default 'ir')
  useEffect(() => {
    if (!editorRef.current) return;

    const isLargeDoc = (value?.length || 0) > 50000;
    let inputSyncTimer: ReturnType<typeof setTimeout> | null = null;
    let statsTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingVal: string | null = null;
    let scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;
    const scrollContainers: HTMLElement[] = [];
    const scrollCleanups: Array<() => void> = [];

    const flushPendingChange = () => {
      if (inputSyncTimer) {
        clearTimeout(inputSyncTimer);
        inputSyncTimer = null;
      }
      if (pendingVal !== null) {
        const val = pendingVal;
        pendingVal = null;
        onChange(val);
      }
    };

    const initialVditorMode = (editorMode === 'source' || editorMode === 'split') ? 'sv' : editorMode;
    const vditor = new Vditor(editorRef.current, {
      value: value || '',
      mode: initialVditorMode, // 'ir' | 'wysiwyg' | 'sv'
      cdn: './vditor', // 100% offline local dist!
      theme: theme === 'dark' ? 'dark' : 'classic',
      lang: 'zh_CN',
      icon: 'ant',
      height: '100%',
      cache: {
        enable: false,
      },
      outline: {
        enable: false,
        position: 'left',
      },
      toolbarConfig: {
        pin: true,
      },
      toolbar: [
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        '|',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'edit-mode',
      ],
      preview: {
        mode: editorMode === 'split' ? 'both' : 'editor',
        maxWidth: 2560,
        theme: {
          current: theme === 'dark' ? 'dark' : 'light',
        },
        hljs: {
          style: theme === 'dark' ? 'atom-one-dark' : 'github',
          lineNumber: true,
        },
        math: {
          inlineDigit: true,
          engine: 'KaTeX',
        },
        markdown: {
          autoSpace: true,
          toc: true,
        },
      },
      link: {
        isOpen: false, // Prevent Vditor default window.open and blank Electron child windows
      },
      after: () => {
        vditorInstance.current = vditor;
        (window as any).__vditor = vditor;
        (window as any).__triggerEditorChange = (val: string) => onChange(val);
        setIsReady(true);

        // Defer initial word/outline analysis by 1 frame so massive documents paint immediately
        requestAnimationFrame(() => analyzeContent(value || ''));

        if (editorMode === 'source') {
          vditor.setPreviewMode('editor');
        } else if (editorMode === 'split') {
          vditor.setPreviewMode('both');
        }

        // Restore scroll position & attach throttled passive scroll listeners to all mode containers
        const activeReset =
          Array.from(editorRef.current?.querySelectorAll<HTMLElement>('.vditor-reset') || []).find(
            el => el.clientHeight > 0
          ) || (editorRef.current?.querySelector('.vditor-reset') as HTMLElement | null);
        if (activeReset && initialScrollTop && initialScrollTop > 0) {
          setTimeout(() => {
            if (activeReset) activeReset.scrollTop = initialScrollTop;
          }, 80);
        }

        editorRef.current?.querySelectorAll<HTMLElement>('.vditor-reset, .vditor-sv').forEach((el) => {
          scrollContainers.push(el);
          const onElScroll = () => {
            if (scrollThrottleTimer) return;
            scrollThrottleTimer = setTimeout(() => {
              scrollThrottleTimer = null;
              onScrollChange?.(el.scrollTop);
            }, 150);
          };
          el.addEventListener('scroll', onElScroll, { passive: true });
          scrollCleanups.push(() => el.removeEventListener('scroll', onElScroll));
        });

        // Enhance tooltips on all toolbar buttons (use aria-label only to prevent ugly browser tooltip)
        const buttons = editorRef.current?.querySelectorAll<HTMLButtonElement>('.vditor-toolbar__item button');
        buttons?.forEach((btn) => {
          const type = btn.getAttribute('data-type') || '';
          const label = TOOLBAR_TOOLTIPS[type] || btn.getAttribute('aria-label') || '';
          if (label) {
            btn.setAttribute('aria-label', label);
          }
          btn.removeAttribute('title');
        });
      },
      input: (val: string) => {
        isInternalChange.current = true;
        pendingVal = val;

        // Debounce full-app state & stats updates to keep typing smooth on 300k+ char files
        const changeDelay = val.length > 50000 || isLargeDoc ? 240 : 120;
        const statsDelay = val.length > 50000 || isLargeDoc ? 450 : 200;

        if (inputSyncTimer) clearTimeout(inputSyncTimer);
        inputSyncTimer = setTimeout(() => {
          inputSyncTimer = null;
          if (pendingVal !== null) {
            const latest = pendingVal;
            pendingVal = null;
            lastEmittedValueRef.current = latest;
            onChange(latest);
          }
          setTimeout(() => {
            isInternalChange.current = false;
          }, 60);
        }, changeDelay);

        if (statsTimer) clearTimeout(statsTimer);
        statsTimer = setTimeout(() => {
          statsTimer = null;
          analyzeContent(val);
        }, statsDelay);
      },
    });

    return () => {
      flushPendingChange();
      if (statsTimer) clearTimeout(statsTimer);
      if (scrollThrottleTimer) clearTimeout(scrollThrottleTimer);
      scrollCleanups.forEach(fn => fn());
      try {
        vditor.destroy();
      } catch (err) {
        // ignore
      }
    };
  }, []);

  // Update value when active document changes externally (skip redundant 700ms+ getValue on mount)
  useEffect(() => {
    if (!isReady || !vditorInstance.current || isInternalChange.current) return;
    if (lastEmittedValueRef.current === value || lastMountedValueRef.current === value) {
      lastMountedValueRef.current = '';
      return;
    }
    const currentVal = vditorInstance.current.getValue();
    if (currentVal !== value) {
      vditorInstance.current.setValue(value || '');
      requestAnimationFrame(() => analyzeContent(value || ''));
    }
  }, [value, isReady]);

  // Update Theme dynamically
  useEffect(() => {
    if (isReady && vditorInstance.current) {
      vditorInstance.current.setTheme(
        theme === 'dark' ? 'dark' : 'classic',
        theme === 'dark' ? 'dark' : 'light',
        theme === 'dark' ? 'atom-one-dark' : 'github'
      );
    }
  }, [theme, isReady]);

  // Code Block Language Autocomplete & Interaction (Arrow keys, Enter, Click Selection)
  useEffect(() => {
    const editorContainer = editorRef.current;
    if (!isReady || !editorContainer) return;

    let activeCodeInfoEl: HTMLElement | null = null;
    let suppressHintUntil = 0;

    const handleFocusOrInput = (e: Event) => {
      const target = e.target as HTMLElement;
      const infoEl = target?.closest?.('[data-type="code-block-info"]') as HTMLElement;
      if (infoEl) {
        activeCodeInfoEl = infoEl;
      }
    };

    const applyLanguageSelection = (selectedLang: string) => {
      suppressHintUntil = Date.now() + 600;

      let infoEl = activeCodeInfoEl;
      if (!infoEl || !editorContainer.contains(infoEl)) {
        infoEl = editorContainer.querySelector('.vditor-ir__node--expand [data-type="code-block-info"]') as HTMLElement;
      }
      if (!infoEl) {
        infoEl = editorContainer.querySelector('[data-type="code-block-info"]:focus') as HTMLElement;
      }
      if (!infoEl) return;

      const cleanLang = decodeURIComponent(selectedLang).trim().toLowerCase();
      if (!cleanLang) return;

      // 1. Update text content with zero-width space
      infoEl.textContent = '\u200B' + cleanLang;

      // 2. Update code block's code tags class
      const blockEl = infoEl.closest('[data-type="code-block"]');
      if (blockEl) {
        blockEl.querySelectorAll('code').forEach((c) => {
          c.className = 'language-' + cleanLang;
        });
      }

      // 3. Forcibly hide and clear the hint popup
      const hintEl = document.querySelector('.vditor-hint') as HTMLElement;
      if (hintEl) {
        hintEl.style.display = 'none';
        hintEl.innerHTML = '';
      }
      const vd = (vditorInstance.current as any)?.vditor;
      if (vd?.hint?.element) {
        vd.hint.element.style.display = 'none';
        vd.hint.element.innerHTML = '';
        vd.hint.recentLanguage = cleanLang;
      }

      // 4. Blur info element and move cursor into code content
      infoEl.blur();
      const codeNode = blockEl?.querySelector('code');
      if (codeNode) {
        try {
          const range = document.createRange();
          range.selectNodeContents(codeNode);
          range.collapse(true);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch (e) {
          // ignore
        }
      }

      // 5. Sync markdown value directly without triggering processHint
      if (vditorInstance.current) {
        const val = vditorInstance.current.getValue();
        onChange(val);
        analyzeContent(val);
        if (vd?.undo) {
          vd.undo.addToUndoStack(vd);
        }
      }
    };

    // Track the latest active selection in the editor so toolbar clicks don't lose it
    let savedSelection: {
      text: string;
      range: Range | null;
      blocks: HTMLElement[];
    } = { text: '', range: null, blocks: [] };

    const getActiveModeRoot = () => {
      const vd = (vditorInstance.current as any)?.vditor;
      if (!vd) return null;
      const isWysiwyg = vd.currentMode === 'wysiwyg';
      const modeObj = isWysiwyg ? vd.wysiwyg : vd.ir;
      if (!modeObj?.element) return null;
      return { vd, isWysiwyg, modeObj, rootEl: modeObj.element as HTMLElement };
    };

    const findBlock = (node: Node | null, rootEl: HTMLElement): HTMLElement | null => {
      let curr = node;
      while (curr && curr !== rootEl) {
        if (
          curr.nodeType === Node.ELEMENT_NODE &&
          ((curr as HTMLElement).getAttribute('data-block') === '0' || curr.parentNode === rootEl)
        ) {
          return curr as HTMLElement;
        }
        curr = curr.parentNode;
      }
      return null;
    };

    const updateSavedSelection = () => {
      const state = getActiveModeRoot();
      if (!state) return;
      const { rootEl } = state;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (!rootEl.contains(range.startContainer) && !rootEl.contains(range.endContainer)) {
        return;
      }

      const text = sel.toString().trim();
      const startBlock = findBlock(range.startContainer, rootEl);
      const endBlock = findBlock(range.endContainer, rootEl);
      const blocks: HTMLElement[] = [];

      if (startBlock && endBlock) {
        if (startBlock === endBlock) {
          blocks.push(startBlock);
        } else {
          let curr: Element | null = startBlock;
          while (curr) {
            if (curr.getAttribute('data-block') === '0' || curr.parentNode === rootEl) {
              blocks.push(curr as HTMLElement);
            }
            if (curr === endBlock) break;
            curr = curr.nextElementSibling;
          }
        }
      } else if (startBlock) {
        blocks.push(startBlock);
      }

      savedSelection = {
        text,
        range: range.cloneRange(),
        blocks,
      };

      // Dynamically track table context (only update React state when entering/updating/leaving a table)
      const ctx = getTableContext(vditorInstance.current, range);
      setTableContext(prev => (!prev.inTable && !ctx.inTable ? prev : ctx));

      const tableBtn = editorContainer.querySelector('.vditor-toolbar button[data-type="table"]') as HTMLButtonElement;
      if (tableBtn) {
        if (ctx.inTable) {
          tableBtn.setAttribute('aria-label', '表格操作工具箱 (Ctrl+T)');
          tableBtn.classList.add('vditor-menu--current');
        } else {
          tableBtn.setAttribute('aria-label', '插入表格 / 表格工具箱 (Ctrl+T)');
          tableBtn.classList.remove('vditor-menu--current');
        }
      }
    };

    let selRafId: number | null = null;
    const scheduleSelectionUpdate = () => {
      if (selRafId !== null) return;
      selRafId = requestAnimationFrame(() => {
        selRafId = null;
        updateSavedSelection();
      });
    };

    document.addEventListener('selectionchange', scheduleSelectionUpdate);

    // Prevent blur on mousedown so focus and selection inside code-block-info are preserved
    const handleMouseDownCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do NOT intercept toolbar dropdowns or heading buttons!
      if (target?.closest?.('.vditor-toolbar') || target?.closest?.('.vditor-panel--arrow')) {
        return;
      }

      const btn = target?.closest?.('.vditor-hint button') as HTMLButtonElement;
      if (btn) {
        e.preventDefault();
      }
    };

    // Professional Heading Application Engine
    // 无论是聚焦光标在某一行，还是选中了文本：
    // 1. 若当前行/块已有文本：直接将该行/块转换为目标标题级别（H1~H6 或正文段落）
    // 2. 若当前行/块为空行：转换为对应级别的空标题
    const applyHeading = (targetLevel: number) => {
      const state = getActiveModeRoot();
      if (!state) return;
      const { vd, isWysiwyg, modeObj, rootEl } = state;

      const lute = vd.lute || (window as any).Lute?.New();

      const sel = window.getSelection();
      let currentRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!currentRange || !rootEl.contains(currentRange.startContainer)) {
        if (savedSelection.range && rootEl.contains(savedSelection.range.startContainer)) {
          currentRange = savedSelection.range;
        } else if (modeObj.range) {
          currentRange = modeObj.range;
        }
      }

      const startBlock = currentRange ? findBlock(currentRange.startContainer, rootEl) : null;
      const endBlock = currentRange ? findBlock(currentRange.endContainer, rootEl) : null;

      let blocks: HTMLElement[] = [];
      if (startBlock && endBlock) {
        if (startBlock === endBlock) {
          blocks = [startBlock];
        } else {
          let curr: Element | null = startBlock;
          while (curr) {
            if (curr.getAttribute('data-block') === '0' || curr.parentNode === rootEl) {
              blocks.push(curr as HTMLElement);
            }
            if (curr === endBlock) break;
            curr = curr.nextElementSibling;
          }
        }
      } else if (startBlock) {
        blocks = [startBlock];
      } else if (savedSelection.blocks.length > 0) {
        blocks = savedSelection.blocks.filter((b) => rootEl.contains(b));
      } else {
        const fallback = rootEl.querySelector('.vditor-ir__node--expand') || rootEl.firstElementChild;
        if (fallback) blocks = [fallback as HTMLElement];
      }

      if (blocks.length === 0) return;

      let lastUpdatedNode: HTMLElement | null = null;

      blocks.forEach((b) => {
        const clone = b.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('.vditor-ir__marker').forEach((m) => m.remove());
        const cleanText = clone.textContent?.trim() || '';

        let newMarkdown = '';
        if (cleanText.length > 0) {
          newMarkdown = targetLevel === 0 ? cleanText : '#'.repeat(targetLevel) + ' ' + cleanText;
        } else {
          newMarkdown = targetLevel === 0 ? '' : '#'.repeat(targetLevel) + ' ';
        }

        const newHtml = isWysiwyg && lute?.SpinVditorDOM
          ? lute.SpinVditorDOM(newMarkdown)
          : lute.SpinVditorIRDOM(newMarkdown);
        const temp = document.createElement('div');
        temp.innerHTML = newHtml;
        const newNode = temp.firstElementChild as HTMLElement;

        if (newNode && b.parentNode) {
          b.parentNode.replaceChild(newNode, b);
          lastUpdatedNode = newNode;
        }
      });

      if (lastUpdatedNode) {
        try {
          const range = document.createRange();
          range.selectNodeContents(lastUpdatedNode);
          range.collapse(false);
          const currentSel = window.getSelection();
          currentSel?.removeAllRanges();
          currentSel?.addRange(range);
          modeObj.range = range;
        } catch (e) {
          // ignore
        }
      }

      // Reset saved selection
      savedSelection = { text: '', range: null, blocks: [] };

      // Dismiss heading dropdown
      const headingPanel = editorContainer.querySelector('.vditor-toolbar__item .vditor-panel--arrow') as HTMLElement;
      if (headingPanel) {
        headingPanel.style.display = 'none';
      }
      const headingBtn = editorContainer.querySelector('[data-type="headings"]') as HTMLElement;
      if (headingBtn) {
        if (targetLevel === 0) {
          headingBtn.classList.remove('vditor-menu--current');
        } else {
          headingBtn.classList.add('vditor-menu--current');
        }
        headingBtn.blur();
      }

      // Focus back to editor
      rootEl.focus();

      // Sync state and undo
      if (vditorInstance.current) {
        const val = vditorInstance.current.getValue();
        onChange(val);
        analyzeContent(val);
        if (vd.undo) {
          vd.undo.addToUndoStack(vd);
        }
      }
    };

    // Bind main headings button: click to toggle dropdown card, NEVER cancel heading
    const mainHeadingBtn = editorContainer.querySelector('[data-type="headings"]') as HTMLButtonElement;
    if (mainHeadingBtn) {
      const newMainHeadingBtn = mainHeadingBtn.cloneNode(true) as HTMLButtonElement;
      mainHeadingBtn.parentNode?.replaceChild(newMainHeadingBtn, mainHeadingBtn);

      newMainHeadingBtn.addEventListener('mousedown', (e) => {
        updateSavedSelection();
        e.preventDefault();
        e.stopPropagation();
      });

      newMainHeadingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        updateSavedSelection();

        const panel = editorContainer.querySelector('.vditor-toolbar__item .vditor-panel--arrow') as HTMLElement;
        if (!panel) return;

        // Toggle card open/close (NEVER directly remove heading!)
        if (panel.style.display === 'block') {
          panel.style.display = 'none';
        } else {
          // Close other popover panels if open
          editorContainer.querySelectorAll<HTMLElement>('.vditor-panel--arrow').forEach((p) => {
            if (p !== panel) p.style.display = 'none';
          });
          panel.style.display = 'block';
        }
      });
    }

    // Bind and format the heading dropdown card buttons (一级标题 ~ 六级标题 + 正文段落)
    const headingPanel = editorContainer.querySelector('.vditor-toolbar__item .vditor-panel--arrow');
    if (headingPanel) {
      const headingNames = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题'];
      const buttons = headingPanel.querySelectorAll<HTMLButtonElement>('button[data-tag]');
      buttons.forEach((btn, index) => {
        const level = index + 1;
        // Clone button to completely remove Vditor's original conflicting click listener
        const newBtn = btn.cloneNode(false) as HTMLButtonElement;
        newBtn.innerHTML = `<span>${headingNames[index]}</span><span class="hotkey-tip">&lt;Ctrl+${level}&gt;</span>`;
        btn.parentNode?.replaceChild(newBtn, btn);

        // Prevent mousedown from blurring/deselecting editor text
        newBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          applyHeading(level);
        });
      });

      // Add divider and paragraph option (正文段落 <Ctrl+0>) if not present
      if (!headingPanel.querySelector('button[data-tag="p"]')) {
        const divider = document.createElement('div');
        divider.style.borderTop = '1px solid #3f3f46';
        divider.style.margin = '4px 0';
        headingPanel.appendChild(divider);

        const pBtn = document.createElement('button');
        pBtn.setAttribute('data-tag', 'p');
        pBtn.innerHTML = `<span>正文段落</span><span class="hotkey-tip">&lt;Ctrl+0&gt;</span>`;
        pBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        pBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          applyHeading(0);
        });
        headingPanel.appendChild(pBtn);
      }
    }

    // Bind main Table button: toggle Grid Picker (not in table) or Table Command Center (in table)
    const mainTableBtn = editorContainer.querySelector('.vditor-toolbar button[data-type="table"]') as HTMLButtonElement;
    if (mainTableBtn) {
      const newMainTableBtn = mainTableBtn.cloneNode(true) as HTMLButtonElement;
      mainTableBtn.parentNode?.replaceChild(newMainTableBtn, mainTableBtn);

      newMainTableBtn.addEventListener('mousedown', (e) => {
        updateSavedSelection();
        e.preventDefault();
        e.stopPropagation();
      });

      newMainTableBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        updateSavedSelection();

        setTableAnchorPos(getTableAnchorPos());

        const ctx = getTableContext(vditorInstance.current);
        setTableContext(ctx);

        if (ctx.inTable) {
          setShowTablePopover(prev => !prev);
          setShowGridPicker(false);
        } else {
          setShowGridPicker(prev => !prev);
          setShowTablePopover(false);
        }
      });
    }

    // Click on hint button: Apply language
    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do NOT intercept toolbar dropdowns or heading buttons!
      if (target?.closest?.('.vditor-toolbar') || target?.closest?.('.vditor-panel--arrow')) {
        return;
      }

      const btn = target?.closest?.('.vditor-hint button') as HTMLButtonElement;
      if (btn) {
        if (btn.hasAttribute('data-tag') || btn.hasAttribute('data-mode')) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const rawVal = btn.getAttribute('data-value') || btn.textContent || '';
        applyLanguageSelection(rawVal);
      }
    };

    // Mode switcher (即时渲染 IR / 所见即所得 WYSIWYG / 源码模式 Source / 分屏预览 Split)
    const applyEditorMode = (targetMode: EditorMode) => {
      const vdInst = vditorInstance.current;
      const vd = (vdInst as any)?.vditor;
      if (!vdInst || !vd) return;

      const editModePanel = editorRef.current?.querySelector('.vditor-toolbar button[data-type="edit-mode"]')?.parentElement?.querySelector('.vditor-panel--arrow') as HTMLElement | null;
      if (editModePanel) {
        editModePanel.style.display = 'none';
      }

      if (targetMode === 'ir' || targetMode === 'wysiwyg') {
        lastRichModeRef.current = targetMode;
        if (vd.currentMode !== targetMode) {
          const nativeBtn = editorRef.current?.querySelector(`.vditor-toolbar button[data-mode="${targetMode}"]`) as HTMLButtonElement | null;
          nativeBtn?.click();
        }
      } else if (targetMode === 'source') {
        if (vd.currentMode !== 'sv') {
          const nativeBtn = editorRef.current?.querySelector('.vditor-toolbar button[data-mode="sv"]') as HTMLButtonElement | null;
          nativeBtn?.click();
        }
        vdInst.setPreviewMode('editor');
      } else if (targetMode === 'split') {
        if (vd.currentMode !== 'sv') {
          const nativeBtn = editorRef.current?.querySelector('.vditor-toolbar button[data-mode="sv"]') as HTMLButtonElement | null;
          nativeBtn?.click();
        }
        vdInst.setPreviewMode('both');
      }

      currentModeRef.current = targetMode;
      onEditorModeChange?.(targetMode);

      // Update active indicator on custom/native edit-mode dropdown items
      if (editModePanel) {
        editModePanel.querySelectorAll('button').forEach(btn => {
          const m = btn.getAttribute('data-mf-mode') || btn.getAttribute('data-mode');
          btn.classList.toggle('vditor-menu--current', m === targetMode);
        });
      }
    };

    const toggleSourceMode = () => {
      const targetMode: EditorMode = currentModeRef.current === 'source'
        ? lastRichModeRef.current
        : 'source';
      applyEditorMode(targetMode);
    };

    // Enhance Edit Mode dropdown with 4 distinct modes: 即时渲染, 所见即所得, 源码模式, 分屏预览
    const editModeBtnWrap = editorContainer.querySelector('.vditor-toolbar button[data-type="edit-mode"]')?.parentElement;
    const editModePanel = editModeBtnWrap?.querySelector('.vditor-panel--arrow');
    if (editModePanel) {
      // Keep native hidden buttons so Vditor's internal mode-switch click handlers keep working cleanly
      const nativeWysiwyg = editModePanel.querySelector('button[data-mode="wysiwyg"]') as HTMLButtonElement | null;
      const nativeIr = editModePanel.querySelector('button[data-mode="ir"]') as HTMLButtonElement | null;
      const nativeSv = editModePanel.querySelector('button[data-mode="sv"]') as HTMLButtonElement | null;

      if (nativeWysiwyg && nativeIr && nativeSv && !editModePanel.querySelector('[data-mf-mode="source"]')) {
        [nativeWysiwyg, nativeIr, nativeSv].forEach(b => {
          b.style.setProperty('display', 'none', 'important');
        });

        const modes: { id: EditorMode; label: string; hotkey?: string }[] = [
          { id: 'wysiwyg', label: '所见即所得', hotkey: 'Ctrl+Alt+7' },
          { id: 'ir', label: '即时渲染 (IR)', hotkey: 'Ctrl+Alt+8' },
          { id: 'source', label: '源码模式 (纯文本)', hotkey: 'Ctrl+/' },
          { id: 'split', label: '分屏预览 (双栏)', hotkey: 'Ctrl+Alt+9' },
        ];

        modes.forEach(({ id, label, hotkey }) => {
          const btn = document.createElement('button');
          btn.setAttribute('data-mf-mode', id);
          if (id === currentModeRef.current) {
            btn.classList.add('vditor-menu--current');
          }
          btn.innerHTML = `<span>${label}</span>${hotkey ? `<span class="hotkey-tip">&lt;${hotkey}&gt;</span>` : ''}`;
          btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            applyEditorMode(id);
          });
          editModePanel.appendChild(btn);
        });
      }
    }

    const handleSetEditorModeEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      if (detail.mode === 'toggle-source') {
        toggleSourceMode();
      } else if (detail.mode) {
        applyEditorMode(detail.mode as EditorMode);
      }
    };
    window.addEventListener('markforge-set-editor-mode', handleSetEditorModeEvent);

    // Keyboard navigation (Ctrl+1..6, Ctrl+0, Ctrl+/, Ctrl+T, Ctrl+Enter, Alt+Arrows, Tab)
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      // Heading & mode & table shortcuts: Ctrl+1..6, Ctrl+0, Ctrl+/, Ctrl+T
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          applyHeading(parseInt(e.key, 10));
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          applyHeading(0); // Normal paragraph text
          return;
        }
        if (e.key === '/') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toggleSourceMode();
          return;
        }
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setTableAnchorPos(getTableAnchorPos());
          const ctx = getTableContext(vditorInstance.current);
          setTableContext(ctx);
          if (ctx.inTable) {
            setShowTablePopover(prev => !prev);
            setShowGridPicker(false);
          } else {
            setShowGridPicker(prev => !prev);
            setShowTablePopover(false);
          }
          return;
        }
        // Ctrl+Enter: Insert row below when in table
        if (e.key === 'Enter') {
          const ctx = getTableContext(vditorInstance.current);
          if (ctx.inTable) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            executeTableAction('insert-row-below');
            return;
          }
        }
      }

      // Table row deletion: Ctrl+Shift+Backspace
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key === 'Backspace') {
        const ctx = getTableContext(vditorInstance.current);
        if (ctx.inTable) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          executeTableAction('delete-row');
          return;
        }
      }

      // Table row/column movement: Alt+ArrowUp/Down/Left/Right
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          const ctx = getTableContext(vditorInstance.current);
          if (ctx.inTable) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (e.key === 'ArrowUp') executeTableAction('move-row-up');
            else if (e.key === 'ArrowDown') executeTableAction('move-row-down');
            else if (e.key === 'ArrowLeft') executeTableAction('move-col-left');
            else if (e.key === 'ArrowRight') executeTableAction('move-col-right');
            return;
          }
        }
      }

      // Table cell Tab jumping & auto-append row at last cell
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const hintEl = (document.querySelector('.vditor-content > .vditor-hint') || document.querySelector(':not(.vditor-toolbar) > .vditor-hint')) as HTMLElement;
        const isHintVisible = hintEl && (hintEl.style.display === 'block' || (hintEl.style.display !== 'none' && window.getComputedStyle(hintEl).display !== 'none'));
        if (!isHintVisible) {
          const ctx = getTableContext(vditorInstance.current);
          if (ctx.inTable) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleTableTab(vditorInstance.current, e.shiftKey, (val) => {
              onChange(val);
              analyzeContent(val);
            });
            setTableContext(getTableContext(vditorInstance.current));
            return;
          }
        }
      }

      // Code block language autocomplete popup navigation
      const hintEl = (document.querySelector('.vditor-content > .vditor-hint') || document.querySelector(':not(.vditor-toolbar) > .vditor-hint')) as HTMLElement;
      if (!hintEl || hintEl.closest('.vditor-toolbar')) return;

      const isVisible = hintEl.style.display === 'block' || (hintEl.style.display !== 'none' && window.getComputedStyle(hintEl).display !== 'none');
      if (!isVisible) return;

      const buttons = Array.from(hintEl.querySelectorAll('button'));
      if (buttons.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentIndex = buttons.findIndex(b => b.classList.contains('vditor-hint--current'));
        buttons.forEach(b => b.classList.remove('vditor-hint--current'));
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length;
        buttons[nextIndex].classList.add('vditor-hint--current');
        buttons[nextIndex].scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentIndex = buttons.findIndex(b => b.classList.contains('vditor-hint--current'));
        buttons.forEach(b => b.classList.remove('vditor-hint--current'));
        const prevIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prevIndex].classList.add('vditor-hint--current');
        buttons[prevIndex].scrollIntoView({ block: 'nearest' });
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const currentBtn = (hintEl.querySelector('.vditor-hint--current') as HTMLButtonElement) || buttons[0];
        if (currentBtn) {
          const rawVal = currentBtn.getAttribute('data-value') || currentBtn.textContent || '';
          applyLanguageSelection(rawVal);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hintEl.style.display = 'none';
        hintEl.innerHTML = '';
        return;
      }
    };

    // Close heading dropdown on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target?.closest?.('.vditor-toolbar__item')) {
        const panel = editorContainer.querySelector('.vditor-toolbar__item .vditor-panel--arrow') as HTMLElement;
        if (panel && panel.style.display !== 'none') {
          panel.style.display = 'none';
        }
        const headingBtn = editorContainer.querySelector('[data-type="headings"]') as HTMLElement;
        if (headingBtn) {
          headingBtn.classList.remove('vditor-menu--current');
        }
      }
    };

    // MutationObserver to enforce hint dismissal during suppression window
    const hintElement = document.querySelector('.vditor-content > .vditor-hint') as HTMLElement;
    let observer: MutationObserver | null = null;
    if (hintElement) {
      observer = new MutationObserver(() => {
        if (Date.now() < suppressHintUntil && hintElement.style.display !== 'none') {
          hintElement.style.display = 'none';
          hintElement.innerHTML = '';
        }
      });
      observer.observe(hintElement, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    }

    // Listen to custom menu actions from Header or global events
    const handleCustomTableAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { action, payload } = customEvent.detail || {};
      executeTableAction(action, payload);
    };

    const handleCustomHeadingAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { level } = customEvent.detail || {};
      if (typeof level === 'number') {
        applyHeading(level);
      }
    };

    const handleCustomFormatAction = (e: Event) => {
      const vd = vditorInstance.current;
      if (!vd) return;
      const { action, payload } = (e as CustomEvent)?.detail || {};
      dispatchFormatAction(action, payload, {
        vditor: vd,
        editorContainer: editorRef.current,
        applyHeading,
        onChange,
        toggleSourceMode,
      });
    };

    window.addEventListener('markforge-table-action', handleCustomTableAction);
    window.addEventListener('markforge-heading-action', handleCustomHeadingAction);
    window.addEventListener('markforge-format-action', handleCustomFormatAction);

    // Modern Right-Click Context Menu Listener
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const vditorContent = editorContainer.querySelector('.vditor-content');
      if (!vditorContent || !vditorContent.contains(target)) {
        return;
      }

      const toolbar = editorContainer.querySelector('.vditor-toolbar');
      if (toolbar && toolbar.contains(target)) {
        return;
      }

      e.preventDefault();

      const sel = window.getSelection();
      const selectedText = sel ? sel.toString() : '';
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

      const tblCtx = getTableContext(vditorInstance.current, range);

      const targetLink = extractLinkInfo(target);

      const imgEl = target.closest('img') || (target.tagName === 'IMG' ? target as HTMLImageElement : null);
      const targetImage = imgEl ? { src: imgEl.getAttribute('src') || '', alt: imgEl.getAttribute('alt') || '' } : null;

      setHoverLinkTooltip(null);
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        selectedText,
        hasSelection: selectedText.trim().length > 0,
        isInTable: tblCtx ? !!tblCtx.inTable : false,
        tableContext: tblCtx,
        targetLink,
        targetImage,
      });
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.context-menu-popover, .context-menu-submenu')) {
        return;
      }
      setContextMenu(null);
      setHoverLinkTooltip(null);
    };

    // Click on editor link: Support Ctrl+Click (External & Anchor) and seamless click on TOC links
    const handleEditorLinkClick = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only primary left-click
      const target = e.target as HTMLElement;
      if (!target) return;
      if (target.closest('.vditor-toolbar') || target.closest('.vditor-panel') || target.closest('.vditor-hint')) return;

      const linkInfo = extractLinkInfo(target);
      if (!linkInfo || !linkInfo.href) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (linkInfo.isInternal) {
        // Internal anchor / TOC catalog link:
        // Either user held Ctrl, OR clicked an unexpanded link node
        const irNode = target.closest('.vditor-ir__node');
        const isExpanded = irNode?.classList.contains('vditor-ir__node--expand');

        if (isCtrlOrCmd || !isExpanded) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setHoverLinkTooltip(null);
          scrollToHeadingByAnchor(linkInfo.href, linkInfo.text, getActiveEditorReset());
          return;
        }
      } else {
        // External link (http://, https://, mailto:, etc.)
          if (isCtrlOrCmd) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setHoverLinkTooltip(null);
          openExternalLink(linkInfo.href);
          return;
        }
      }
    };

    // Hover tooltip for links to show Ctrl+Click guidance (deduplicated by target element)
    let lastHoverTarget: HTMLElement | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target === lastHoverTarget) return;
      lastHoverTarget = target;

      if (!target || !editorContainer.contains(target)) {
        setHoverLinkTooltip(prev => (prev ? null : prev));
        return;
      }
      if (target.closest('.vditor-toolbar') || target.closest('.vditor-panel') || target.closest('.vditor-hint')) {
        setHoverLinkTooltip(prev => (prev ? null : prev));
        return;
      }

      const linkInfo = extractLinkInfo(target);
      if (linkInfo && linkInfo.href) {
        const linkNode = (target.closest('a, [data-type="a"]') as HTMLElement) || target;
        const rect = linkNode.getBoundingClientRect();
        const tooltipX = Math.max(10, Math.min(window.innerWidth - 320, rect.left));
        const tooltipY = rect.bottom + 6;

        setHoverLinkTooltip({
          visible: true,
          x: tooltipX,
          y: tooltipY,
          href: linkInfo.href,
          text: linkInfo.text || linkInfo.href,
          isInternal: linkInfo.isInternal,
        });
      } else {
        setHoverLinkTooltip(prev => (prev ? null : prev));
      }
    };

    const handleMouseLeave = () => {
      lastHoverTarget = null;
      setHoverLinkTooltip(null);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('scroll', handleScroll, true);

    editorContainer.addEventListener('focusin', handleFocusOrInput, true);
    editorContainer.addEventListener('input', handleFocusOrInput, true);
    editorContainer.addEventListener('click', handleEditorLinkClick, true);
    editorContainer.addEventListener('mousemove', handleMouseMove, { passive: true });
    editorContainer.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDownCapture, true);
    window.addEventListener('click', handleClickCapture, true);
    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('click', handleOutsideClick, false);

    return () => {
      if (selRafId !== null) cancelAnimationFrame(selRafId);
      observer?.disconnect();
      window.removeEventListener('markforge-set-editor-mode', handleSetEditorModeEvent);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('markforge-table-action', handleCustomTableAction);
      window.removeEventListener('markforge-heading-action', handleCustomHeadingAction);
      window.removeEventListener('markforge-format-action', handleCustomFormatAction);
      document.removeEventListener('selectionchange', scheduleSelectionUpdate);
      editorContainer.removeEventListener('focusin', handleFocusOrInput, true);
      editorContainer.removeEventListener('input', handleFocusOrInput, true);
      editorContainer.removeEventListener('click', handleEditorLinkClick, true);
      editorContainer.removeEventListener('mousemove', handleMouseMove);
      editorContainer.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDownCapture, true);
      window.removeEventListener('click', handleClickCapture, true);
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('click', handleOutsideClick, false);
    };
  }, [isReady]);

  // Close slash menu on outside click or ESC
  useEffect(() => {
    if (!showSlashMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc, true);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc, true);
    };
  }, [showSlashMenu]);

  useFocusAndTypewriter(editorRef, isReady, isTypewriterMode, isFocusMode);
  useCodeBlockSync(editorRef, isReady, theme);

  const insertText = (template: string) => {
    if (!vditorInstance.current) return;
    vditorInstance.current.insertValue(template);
    setShowSlashMenu(false);
  };

  return (
    <div className={`relative flex-1 h-full w-full flex flex-col bg-[var(--bg-canvas)] overflow-hidden min-h-0 ${
      isTypewriterMode ? 'typewriter-mode-active' : ''
    } ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <div ref={editorRef} className="flex-1 w-full h-full min-h-0" />

      <EditorFindBar
        isOpen={findBarState.isOpen}
        onClose={closeFindBar}
        initialQuery={findBarState.initialQuery}
        showReplaceInitially={findBarState.showReplace}
        focusTrigger={findBarState.focusTrigger}
        contentVersion={value}
        getEditorContainer={getActiveEditorReset}
        onReplaceAll={handleReplaceAllInEditor}
        onSyncAfterReplace={handleSyncAfterReplace}
      />

      <TableQuickPill
        tableContext={tableContext}
        onAction={(action) => executeTableAction(action)}
        onToggleToolbox={() => {
          setTableAnchorPos(getTableAnchorPos());
          setShowTablePopover(prev => !prev);
        }}
      />

      <TableGridPicker
        isOpen={showGridPicker}
        onClose={() => setShowGridPicker(false)}
        anchorPosition={tableAnchorPos}
        onInsert={(rows, cols) => executeTableAction('insert-table', { rows, cols })}
      />

      <TableToolbarPopover
        isOpen={showTablePopover}
        onClose={() => setShowTablePopover(false)}
        context={tableContext}
        anchorPosition={tableAnchorPos}
        onAction={(action, payload) => executeTableAction(action, payload)}
      />

      {contextMenu && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          onClose={() => setContextMenu(null)}
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          hasSelection={contextMenu.hasSelection}
          isInTable={contextMenu.isInTable}
          tableContext={contextMenu.tableContext}
          targetLink={contextMenu.targetLink}
          targetImage={contextMenu.targetImage}
          onExecuteCommand={handleExecuteContextMenuCommand}
        />
      )}

      <LinkHoverTooltip tooltip={hoverLinkTooltip} />

      <SlashInsertMenu
        menuRef={slashMenuRef}
        isOpen={showSlashMenu}
        onToggle={() => setShowSlashMenu(prev => !prev)}
        onInsert={insertText}
      />
    </div>
  );
};
