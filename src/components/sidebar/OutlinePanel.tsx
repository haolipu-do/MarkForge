/**
 * @file src/components/sidebar/OutlinePanel.tsx
 * @description 实时 Markdown 多层级大纲树面板，支持关键词筛选、折叠展开与精准跳转高亮
 * @module 侧边栏导航模块
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';

interface OutlinePanelProps {
  markdownContent: string;
  isActive: boolean;
  getActiveEditorElement: () => HTMLElement | null;
}

const LEVEL_COLORS = [
  'text-sky-600 dark:text-sky-400 font-bold',
  'text-emerald-600 dark:text-emerald-400 font-semibold',
  'text-amber-600 dark:text-amber-400 font-medium',
  'text-purple-600 dark:text-purple-400',
  'text-rose-600 dark:text-rose-400',
  'text-zinc-600 dark:text-zinc-400',
];

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  markdownContent,
  isActive,
  getActiveEditorElement,
}) => {
  const [outlineFilter, setOutlineFilter] = useState('');
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(-1);
  const isNavigatingRef = useRef(false);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  const headings = useMemo(() => {
    if (!markdownContent) return [];
    const lines = markdownContent.split('\n');
    const list: { level: number; text: string; line: number; index: number }[] = [];
    let inCode = false;
    let headingIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        list.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i + 1,
          index: headingIdx++,
        });
      }
    }
    return list;
  }, [markdownContent]);

  const filteredHeadings = useMemo(() => {
    if (!outlineFilter.trim()) return headings;
    const q = outlineFilter.toLowerCase();
    return headings.filter(h => h.text.toLowerCase().includes(q));
  }, [headings, outlineFilter]);

  useEffect(() => {
    if (!isActive) return;

    let ticking = false;
    const handleScrollSync = () => {
      if (isNavigatingRef.current || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (isNavigatingRef.current) return;

        const activeReset = getActiveEditorElement();
        if (!activeReset) return;

        const domHeadings = Array.from(
          activeReset.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [data-type="heading"]')
        );
        if (domHeadings.length === 0) return;

        const isAtBottom = activeReset.scrollHeight - activeReset.scrollTop - activeReset.clientHeight <= 40;
        if (isAtBottom) {
          const lastIdx = domHeadings.length - 1;
          setActiveHeadingIndex(prev => (prev === lastIdx ? prev : lastIdx));
          return;
        }

        const currentScroll = activeReset.scrollTop;
        let currentIdx = 0;
        for (let i = 0; i < domHeadings.length; i++) {
          if (domHeadings[i].offsetTop <= currentScroll + 70) {
            currentIdx = i;
          } else {
            break;
          }
        }
        setActiveHeadingIndex(prev => (prev === currentIdx ? prev : currentIdx));
      });
    };

    const activeReset = getActiveEditorElement();
    if (activeReset) {
      activeReset.addEventListener('scroll', handleScrollSync, { passive: true });
      handleScrollSync();
    }

    const timer = setTimeout(handleScrollSync, 150);
    return () => {
      clearTimeout(timer);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      activeReset?.removeEventListener('scroll', handleScrollSync);
    };
  }, [isActive, getActiveEditorElement, markdownContent]);

  const handleHeadingClick = (headingText: string, originalIndex: number) => {
    try {
      const activeReset = getActiveEditorElement();
      if (!activeReset) return;

      const domHeadings = Array.from(
        activeReset.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [data-type="heading"]')
      );
      if (domHeadings.length === 0) return;

      let targetH: HTMLElement | null = null;

      if (originalIndex >= 0 && originalIndex < domHeadings.length) {
        const candidate = domHeadings[originalIndex];
        const candText = candidate.textContent?.replace(/[*_`~[\]#]/g, '').trim().toLowerCase() || '';
        const cleanTarget = headingText.replace(/[*_`~[\]#]/g, '').trim().toLowerCase();
        if (candText.includes(cleanTarget) || cleanTarget.includes(candText)) {
          targetH = candidate;
        }
      }

      if (!targetH) {
        const clean = headingText.replace(/[*_`~[\]#]/g, '').trim().toLowerCase();
        targetH = domHeadings.find(h => {
          const hText = h.textContent?.replace(/[*_`~[\]#]/g, '').trim().toLowerCase() || '';
          return hText.includes(clean) || clean.includes(hText);
        }) || null;
      }

      if (!targetH) return;

      isNavigatingRef.current = true;
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
      }, 850);

      setActiveHeadingIndex(originalIndex);
      activeReset.scrollTo({
        top: Math.max(0, targetH.offsetTop - 18),
        behavior: 'smooth',
      });

      targetH.style.transition = 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease';
      targetH.style.backgroundColor = 'rgba(56, 189, 248, 0.25)';
      targetH.style.boxShadow = '0 0 0 4px rgba(56, 189, 248, 0.15)';
      targetH.style.borderRadius = '6px';

      setTimeout(() => {
        if (targetH) {
          targetH.style.backgroundColor = 'transparent';
          targetH.style.boxShadow = 'none';
        }
      }, 1600);
    } catch (err) {
      console.warn('Failed to jump to heading:', err);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          文档大纲 ({headings.length})
        </span>
      </div>

      {headings.length > 5 && (
        <div className="relative">
          <input
            type="text"
            placeholder="过滤大纲小节..."
            value={outlineFilter}
            onChange={e => setOutlineFilter(e.target.value)}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-sky-500"
          />
        </div>
      )}

      {headings.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          当前文档尚未包含任何标题 (H1~H6)
        </div>
      ) : filteredHeadings.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--text-muted)]">
          未匹配到对应标题
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredHeadings.map((h) => {
            const badgeColor = LEVEL_COLORS[h.level - 1] || 'text-zinc-600 dark:text-zinc-400';
            const isActiveItem = activeHeadingIndex === h.index;
            return (
              <div
                key={h.index}
                onClick={() => handleHeadingClick(h.text, h.index)}
                style={{ paddingLeft: `${(h.level - 1) * 10 + 6}px` }}
                className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-all ${
                  isActiveItem
                    ? 'bg-sky-100/90 border border-sky-300/90 text-sky-950 font-bold shadow-sm dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-300'
                    : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-transparent hover:border-[var(--border-subtle)]'
                }`}
                title={`点击快速跳转至: ${h.text}`}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  {isActiveItem && (
                    <div className="w-1.5 h-3.5 bg-sky-600 dark:bg-sky-400 rounded-full shrink-0 shadow-sm shadow-sky-500/50 -ml-1 mr-0.5 animate-in fade-in duration-150" />
                  )}
                  <span className={`text-[10px] font-mono shrink-0 ${isActiveItem ? 'text-sky-700 dark:text-sky-400 font-bold' : badgeColor}`}>
                    H{h.level}
                  </span>
                  <span className={`truncate ${isActiveItem ? 'text-sky-950 dark:text-sky-200 font-bold' : 'group-hover:text-sky-700 dark:group-hover:text-sky-400'}`}>
                    {h.text}
                  </span>
                </div>
                <span className={`text-[10px] font-mono shrink-0 ml-1 ${isActiveItem ? 'text-sky-700 dark:text-sky-400 font-bold' : 'text-[var(--text-muted)]'}`}>
                  L{h.line}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
