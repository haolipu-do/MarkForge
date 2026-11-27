/**
 * @file src/components/sidebar/SearchPanel.tsx
 * @description 侧边栏全文检索面板，支持大文档流式行扫描、输入防抖、结果上限保护与极速定位跳转
 * @module 侧边栏导航模块
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface SearchPanelProps {
  markdownContent: string;
  isActive: boolean;
  focusTrigger?: number;
  getActiveEditorElement: () => HTMLElement | null;
}

const MAX_RESULTS = 300;

export const SearchPanel: React.FC<SearchPanelProps> = ({
  markdownContent,
  isActive,
  focusTrigger,
  getActiveEditorElement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      }, 60);
    }
  }, [isActive, focusTrigger]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 120);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Zero-split single-pass scan capped at MAX_RESULTS so massive docs never crash React DOM
  const { matches, truncated } = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || !markdownContent) return { matches: [], truncated: false };

    const results: { line: number; text: string }[] = [];
    const lowerDoc = markdownContent.toLowerCase();
    let idx = 0;
    let lineNum = 1;
    let lastPos = 0;
    let hasMore = false;

    while ((idx = lowerDoc.indexOf(q, idx)) !== -1) {
      for (let k = lastPos; k < idx; k++) {
        if (markdownContent.charCodeAt(k) === 10) lineNum++;
      }
      lastPos = idx;

      const prevNewline = markdownContent.lastIndexOf('\n', idx);
      const lineStart = prevNewline === -1 ? 0 : prevNewline + 1;
      const nextNewline = markdownContent.indexOf('\n', idx);
      const lineEnd = nextNewline === -1 ? markdownContent.length : nextNewline;

      results.push({
        line: lineNum,
        text: markdownContent.slice(lineStart, Math.min(lineEnd, lineStart + 160)).trim(),
      });

      if (results.length >= MAX_RESULTS) {
        hasMore = lowerDoc.indexOf(q, lineEnd + 1) !== -1;
        break;
      }
      idx = lineEnd + 1;
    }

    return { matches: results, truncated: hasMore };
  }, [debouncedQuery, markdownContent]);

  const handleJumpToMatch = (text: string) => {
    try {
      const clean = text.slice(0, 25).trim().toLowerCase();
      if (!clean) return;
      const editorEl = getActiveEditorElement();
      if (!editorEl) return;
      const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent?.toLowerCase().includes(clean)) {
          const parent = walker.currentNode.parentElement;
          if (parent) {
            const isFar = Math.abs(parent.getBoundingClientRect().top) > 1800;
            parent.scrollIntoView({ behavior: isFar ? 'auto' : 'smooth', block: 'center' });
            parent.style.transition = 'background-color 0.3s ease, border-radius 0.3s ease';
            parent.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
            parent.style.borderRadius = '4px';
            setTimeout(() => { parent.style.backgroundColor = 'transparent'; }, 1400);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to jump to search match:', err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={searchRef}
          type="text"
          placeholder="搜索当前文档内容..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500"
        />
      </div>

      {debouncedQuery.trim() && (
        <div className="space-y-1">
          <div className="text-[11px] text-[var(--text-muted)] px-1">
            {truncated ? `已展示前 ${MAX_RESULTS} 条匹配（请补充更精确关键词）` : `共找到 ${matches.length} 条匹配`}
          </div>
          {matches.map((res, i) => (
            <div
              key={`${res.line}-${i}`}
              onClick={() => handleJumpToMatch(res.text)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-xs cursor-pointer border border-transparent hover:border-[var(--border-subtle)] flex items-center justify-between"
              title="点击定位到该处内容"
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-sky-400 font-mono text-[10px] shrink-0 font-semibold">L{res.line}</span>
                <span className="text-[var(--text-primary)] truncate">{res.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
