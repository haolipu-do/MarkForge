/**
 * @file src/components/sidebar/SearchPanel.tsx
 * @description 侧边栏全文检索面板，支持实时关键词匹配片段高亮与点击跳转正文对应行
 * @module 侧边栏导航模块
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface SearchPanelProps {
  markdownContent: string;
  isActive: boolean;
  focusTrigger?: number;
  getActiveEditorElement: () => HTMLElement | null;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  markdownContent,
  isActive,
  focusTrigger,
  getActiveEditorElement,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        searchRef.current?.focus();
        searchRef.current?.select();
      }, 60);
    }
  }, [isActive, focusTrigger]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lines = markdownContent.split('\n');
    const matches: { line: number; text: string }[] = [];
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
        matches.push({ line: idx + 1, text: line.trim() });
      }
    });
    return matches;
  }, [searchQuery, markdownContent]);

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
            editorEl.scrollTo({ top: Math.max(0, parent.offsetTop - 30), behavior: 'smooth' });
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

      {searchQuery && (
        <div className="space-y-1">
          <div className="text-[11px] text-[var(--text-muted)] px-1">
            共找到 {searchResults.length} 条匹配
          </div>
          {searchResults.map((res, i) => (
            <div
              key={i}
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
