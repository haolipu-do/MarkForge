/**
 * @file src/components/EditorFindBar.tsx
 * @description 编辑器右上角内嵌式查找与替换浮窗，支持实时高亮计数、大小写敏感及单条/全部替换
 * @module 查找与替换模块
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { CloseButton } from './ui/CloseButton';

interface EditorFindBarProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  showReplaceInitially?: boolean;
  focusTrigger: number;
  contentVersion?: string;
  getEditorContainer: () => HTMLElement | null;
  onReplaceAll: (query: string, replacement: string, caseSensitive: boolean) => number;
  onSyncAfterReplace: () => void;
}

export const EditorFindBar: React.FC<EditorFindBarProps> = ({
  isOpen,
  onClose,
  initialQuery,
  showReplaceInitially = false,
  focusTrigger,
  contentVersion,
  getEditorContainer,
  onReplaceAll,
  onSyncAfterReplace,
}) => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(showReplaceInitially);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const findInputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<Range[]>([]);

  const clearHighlights = useCallback(() => {
    try {
      const cssHighlights = (typeof CSS !== 'undefined' && (CSS as any).highlights) || null;
      if (cssHighlights) {
        cssHighlights.delete('mf-find-match');
        cssHighlights.delete('mf-find-active');
      }
    } catch {
      // ignore if CSS Highlight API unavailable
    }
  }, []);

  const applyHighlights = useCallback((ranges: Range[], currentIdx: number) => {
    try {
      const cssHighlights = (typeof CSS !== 'undefined' && (CSS as any).highlights) || null;
      const HighlightCtor = (window as any).Highlight;
      if (!cssHighlights || !HighlightCtor) return;

      cssHighlights.delete('mf-find-match');
      cssHighlights.delete('mf-find-active');

      if (ranges.length === 0) return;

      const others = ranges.filter((_, i) => i !== currentIdx);
      if (others.length > 0) {
        cssHighlights.set('mf-find-match', new HighlightCtor(...others));
      }
      if (currentIdx >= 0 && currentIdx < ranges.length) {
        cssHighlights.set('mf-find-active', new HighlightCtor(ranges[currentIdx]));
      }
    } catch {
      // ignore highlight errors
    }
  }, []);

  const scrollRangeIntoView = useCallback(
    (range: Range) => {
      const activeReset = getEditorContainer();
      if (!activeReset) return;
      try {
        const rect = range.getBoundingClientRect();
        const resetRect = activeReset.getBoundingClientRect();
        if (rect.top < resetRect.top + 56 || rect.bottom > resetRect.bottom - 40) {
          const relativeTop = rect.top - resetRect.top + activeReset.scrollTop;
          activeReset.scrollTo({
            top: Math.max(0, relativeTop - activeReset.clientHeight / 2 + rect.height / 2),
            behavior: 'smooth',
          });
        }
      } catch {
        // ignore detached range
      }
    },
    [getEditorContainer]
  );

  const scanAndHighlight = useCallback(
    (preserveIndex = false, targetIndexOverride?: number) => {
      if (!isOpen || !query) {
        matchesRef.current = [];
        setMatchCount(0);
        setActiveIndex(-1);
        clearHighlights();
        return;
      }

      const activeReset = getEditorContainer();
      if (!activeReset) {
        matchesRef.current = [];
        setMatchCount(0);
        setActiveIndex(-1);
        clearHighlights();
        return;
      }

      const ranges: Range[] = [];
      const needle = caseSensitive ? query : query.toLowerCase();
      const walker = document.createTreeWalker(activeReset, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent) continue;

        // Skip collapsed/invisible Vditor syntax markers and hidden containers
        if (parent.closest('.vditor-ir__marker') && parent.offsetWidth === 0 && parent.offsetHeight === 0) {
          continue;
        }

        const text = node.nodeValue || '';
        if (!text) continue;

        const hay = caseSensitive ? text : text.toLowerCase();
        let pos = 0;
        while ((pos = hay.indexOf(needle, pos)) !== -1) {
          const r = document.createRange();
          r.setStart(node, pos);
          r.setEnd(node, pos + query.length);
          if (r.getClientRects().length > 0) {
            ranges.push(r);
          }
          pos += Math.max(1, query.length);
        }
      }

      matchesRef.current = ranges;
      setMatchCount(ranges.length);

      if (ranges.length === 0) {
        setActiveIndex(-1);
        clearHighlights();
        return;
      }

      let nextIdx = 0;
      if (typeof targetIndexOverride === 'number') {
        nextIdx = ((targetIndexOverride % ranges.length) + ranges.length) % ranges.length;
      } else if (preserveIndex && activeIndex >= 0) {
        nextIdx = Math.min(activeIndex, ranges.length - 1);
      }

      setActiveIndex(nextIdx);
      applyHighlights(ranges, nextIdx);
      scrollRangeIntoView(ranges[nextIdx]);
    },
    [isOpen, query, caseSensitive, activeIndex, getEditorContainer, clearHighlights, applyHighlights, scrollRangeIntoView]
  );

  // Focus & pre-fill when triggered via Ctrl+F / Ctrl+H
  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setQuery(initialQuery);
      }
      setShowReplace(showReplaceInitially);
      setTimeout(() => {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }, 20);
    } else {
      clearHighlights();
      matchesRef.current = [];
      setMatchCount(0);
      setActiveIndex(-1);
    }
  }, [isOpen, focusTrigger, initialQuery, showReplaceInitially, clearHighlights]);

  // Re-scan when query, case-sensitivity, or content changes
  useEffect(() => {
    if (!isOpen) return;
    scanAndHighlight(false);
  }, [isOpen, query, caseSensitive, contentVersion]);

  // Clean up highlights on unmount
  useEffect(() => {
    return () => clearHighlights();
  }, [clearHighlights]);

  const goToMatch = useCallback(
    (nextIdx: number) => {
      const ranges = matchesRef.current;
      if (ranges.length === 0) return;
      const wrapped = ((nextIdx % ranges.length) + ranges.length) % ranges.length;
      setActiveIndex(wrapped);
      applyHighlights(ranges, wrapped);
      scrollRangeIntoView(ranges[wrapped]);
    },
    [applyHighlights, scrollRangeIntoView]
  );

  const handleClose = useCallback(() => {
    clearHighlights();
    onClose();
    const activeReset = getEditorContainer();
    setTimeout(() => {
      activeReset?.focus({ preventScroll: true });
    }, 20);
  }, [clearHighlights, onClose, getEditorContainer]);

  // Global F3 / Shift+F3 / Escape while FindBar is open
  useEffect(() => {
    if (!isOpen) return;
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === 'F3') {
        e.preventDefault();
        e.stopPropagation();
        goToMatch(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', onGlobalKeyDown, true);
  }, [isOpen, activeIndex, goToMatch, handleClose]);

  const handleReplaceCurrent = () => {
    if (!query || matchesRef.current.length === 0 || activeIndex < 0) return;
    const range = matchesRef.current[activeIndex];
    const activeReset = getEditorContainer();
    if (!range || !activeReset) return;

    try {
      const scrollTop = activeReset.scrollTop;
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const replaced = document.execCommand('insertText', false, replaceText);
      if (!replaced) {
        range.deleteContents();
        range.insertNode(document.createTextNode(replaceText));
        activeReset.dispatchEvent(new Event('input', { bubbles: true }));
      }
      activeReset.scrollTop = scrollTop;
      onSyncAfterReplace();

      setTimeout(() => {
        scanAndHighlight(false, activeIndex);
      }, 40);
    } catch (err) {
      console.warn('Replace failed:', err);
    }
  };

  const handleReplaceAllClick = () => {
    if (!query) return;
    const count = onReplaceAll(query, replaceText, caseSensitive);
    if (count > 0) {
      setTimeout(() => {
        scanAndHighlight(false, 0);
      }, 60);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-[52px] right-6 z-40 flex items-start gap-1.5 p-2 rounded-xl bg-[var(--bg-card)]/95 border border-[var(--border-strong)] shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-1 duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Toggle Replace Drawer Button */}
      <button
        type="button"
        onClick={() => setShowReplace(prev => !prev)}
        className="mt-1 p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title={showReplace ? '收起替换栏' : '展开替换栏 (Ctrl+H)'}
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-150 ${showReplace ? 'rotate-90' : ''}`}
        />
      </button>

      <div className="flex flex-col gap-1.5">
        {/* Find Row */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] focus-within:border-sky-500 transition-colors w-56">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <input
              ref={findInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goToMatch(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClose();
                }
              }}
              placeholder="在当前文档中查找..."
              className="w-full bg-transparent outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
            <button
              type="button"
              onClick={() => setCaseSensitive(prev => !prev)}
              className={`px-1 py-0.5 rounded text-[10px] font-mono font-bold transition-colors shrink-0 ${
                caseSensitive
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
              }`}
              title="区分大小写"
            >
              Aa
            </button>
          </div>

          {/* Match Counter */}
          <span
            className={`min-w-[54px] text-center font-mono text-[11px] tabular-nums ${
              query && matchCount === 0 ? 'text-rose-500 font-semibold' : 'text-[var(--text-muted)]'
            }`}
          >
            {query ? (matchCount > 0 ? `${activeIndex + 1}/${matchCount}` : '无结果') : ''}
          </span>

          {/* Navigation & Close Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => goToMatch(activeIndex - 1)}
              disabled={matchCount === 0}
              className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-35 disabled:pointer-events-none transition-colors"
              title="上一个匹配项 (Shift+Enter)"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => goToMatch(activeIndex + 1)}
              disabled={matchCount === 0}
              className="p-1 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-35 disabled:pointer-events-none transition-colors"
              title="下一个匹配项 (Enter)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <CloseButton
              onClick={handleClose}
              title="关闭查找栏 (Esc)"
              size="sm"
              className="hover:bg-red-500/15 hover:text-red-500"
            />
          </div>
        </div>

        {/* Replace Row */}
        {showReplace && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] focus-within:border-sky-500 transition-colors w-56">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleReplaceCurrent();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleClose();
                  }
                }}
                placeholder="替换为..."
                className="w-full bg-transparent outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>

            <button
              type="button"
              onClick={handleReplaceCurrent}
              disabled={matchCount === 0}
              className="px-2 py-1 rounded-md bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-35 disabled:pointer-events-none text-[11px] font-medium transition-colors"
              title="替换当前匹配项"
            >
              替换
            </button>
            <button
              type="button"
              onClick={handleReplaceAllClick}
              disabled={matchCount === 0}
              className="px-2 py-1 rounded-md bg-[var(--bg-hover)] hover:bg-sky-500/20 text-[var(--text-primary)] hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-35 disabled:pointer-events-none text-[11px] font-medium transition-colors"
              title="替换文档内全部匹配项"
            >
              全部
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
