/**
 * @file src/components/sidebar/OutlinePanel.tsx
 * @description 实时 Markdown 多层级大纲树面板，支持大文档虚拟列表渲染、二分查找滚动同步与极速章节跳转
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

const ROW_HEIGHT = 30;
const VIRTUALIZE_THRESHOLD = 120;

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  markdownContent,
  isActive,
  getActiveEditorElement,
}) => {
  const [outlineFilter, setOutlineFilter] = useState('');
  const [activeHeadingIndex, setActiveHeadingIndex] = useState<number>(-1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);

  const isNavigatingRef = useRef(false);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);
  const domHeadingsRef = useRef<HTMLElement[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Single-pass zero-split heading parser (handles 300k+ char docs without allocating line arrays)
  const headings = useMemo(() => {
    if (!markdownContent) return [];
    const list: { level: number; text: string; line: number; index: number }[] = [];
    const len = markdownContent.length;
    let inCode = false;
    let headingIdx = 0;
    let lineNum = 1;
    let lineStart = 0;

    for (let i = 0; i <= len; i++) {
      if (i < len && markdownContent.charCodeAt(i) !== 10) continue;

      if (i > lineStart) {
        let p = lineStart;
        while (p < i && (markdownContent.charCodeAt(p) === 32 || markdownContent.charCodeAt(p) === 9)) p++;
        const firstCh = p < i ? markdownContent.charCodeAt(p) : 0;

        if (firstCh === 96 && markdownContent.startsWith('```', p)) {
          inCode = !inCode;
        } else if (!inCode && firstCh === 35 /* '#' */) {
          let level = 0;
          while (p + level < i && markdownContent.charCodeAt(p + level) === 35 && level <= 6) {
            level++;
          }
          if (
            level >= 1 &&
            level <= 6 &&
            p + level < i &&
            (markdownContent.charCodeAt(p + level) === 32 || markdownContent.charCodeAt(p + level) === 9)
          ) {
            const text = markdownContent.slice(p + level + 1, i).trim();
            if (text) {
              list.push({ level, text, line: lineNum, index: headingIdx++ });
            }
          }
        }
      }

      lineNum++;
      lineStart = i + 1;
    }

    return list;
  }, [markdownContent]);

  const filteredHeadings = useMemo(() => {
    if (!outlineFilter.trim()) return headings;
    const q = outlineFilter.toLowerCase();
    return headings.filter(h => h.text.toLowerCase().includes(q));
  }, [headings, outlineFilter]);

  const isVirtualized = filteredHeadings.length > VIRTUALIZE_THRESHOLD;

  useEffect(() => {
    const el = listContainerRef.current;
    if (!isVirtualized || !el) return;
    setViewportHeight(el.clientHeight || 500);
    const onResize = () => setViewportHeight(el.clientHeight || 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isVirtualized]);

  // Track active heading via IntersectionObserver (zero forced layout / offsetTop reflows on 300k+ docs)
  useEffect(() => {
    if (!isActive) return;

    let io: IntersectionObserver | null = null;
    let initTimer: ReturnType<typeof setTimeout> | null = null;
    let scrollFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const setupObserver = () => {
      const activeReset = getActiveEditorElement();
      if (!activeReset) return;

      const domHeadings = Array.from(
        activeReset.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [data-type="heading"]')
      );
      domHeadingsRef.current = domHeadings;
      if (domHeadings.length === 0) return;

      if (activeReset.scrollTop <= 10) {
        setActiveHeadingIndex(prev => (prev === 0 ? prev : 0));
      }

      const indexMap = new WeakMap<Element, number>();
      domHeadings.forEach((el, idx) => indexMap.set(el, idx));

      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          if (isNavigatingRef.current) return;
          let latestIntersecting = -1;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const idx = indexMap.get(entry.target);
              if (idx !== undefined && idx > latestIntersecting) {
                latestIntersecting = idx;
              }
            }
          }
          if (latestIntersecting >= 0) {
            setActiveHeadingIndex(prev => (prev === latestIntersecting ? prev : latestIntersecting));
          }
        },
        { root: activeReset, rootMargin: '0px 0px -75% 0px', threshold: 0 }
      );

      domHeadings.forEach((h) => io!.observe(h));
    };

    const activeReset = getActiveEditorElement();
    const onScrollBottomCheck = () => {
      if (isNavigatingRef.current || scrollFallbackTimer !== null || !activeReset) return;
      scrollFallbackTimer = setTimeout(() => {
        scrollFallbackTimer = null;
        if (isNavigatingRef.current) return;
        const atBottom = activeReset.scrollHeight - activeReset.scrollTop - activeReset.clientHeight <= 40;
        if (atBottom && domHeadingsRef.current.length > 0) {
          const lastIdx = domHeadingsRef.current.length - 1;
          setActiveHeadingIndex(prev => (prev === lastIdx ? prev : lastIdx));
        }
      }, 150);
    };

    if (activeReset) {
      setupObserver();
      activeReset.addEventListener('scroll', onScrollBottomCheck, { passive: true });
    }
    initTimer = setTimeout(setupObserver, 200);

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (scrollFallbackTimer) clearTimeout(scrollFallbackTimer);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      io?.disconnect();
      activeReset?.removeEventListener('scroll', onScrollBottomCheck);
    };
  }, [isActive, getActiveEditorElement, markdownContent]);

  const handleHeadingClick = (headingText: string, originalIndex: number) => {
    try {
      const activeReset = getActiveEditorElement();
      if (!activeReset) return;

      const domHeadings =
        domHeadingsRef.current.length > 0 && activeReset.contains(domHeadingsRef.current[0])
          ? domHeadingsRef.current
          : (domHeadingsRef.current = Array.from(
              activeReset.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, [data-type="heading"]')
            ));

      if (domHeadings.length === 0) return;

      let targetH: HTMLElement | null = null;
      const cleanTarget = headingText.replace(/[*_`~[\]#]/g, '').trim().toLowerCase();

      if (originalIndex >= 0 && originalIndex < domHeadings.length) {
        const candidate = domHeadings[originalIndex];
        const candText = candidate.textContent?.replace(/[*_`~[\]#]/g, '').trim().toLowerCase() || '';
        if (candText.includes(cleanTarget) || cleanTarget.includes(candText)) {
          targetH = candidate;
        }
      }

      if (!targetH) {
        targetH = domHeadings.find(h => {
          const hText = h.textContent?.replace(/[*_`~[\]#]/g, '').trim().toLowerCase() || '';
          return hText.includes(cleanTarget) || cleanTarget.includes(hText);
        }) || null;
      }

      if (!targetH) return;

      // Use instant scroll on large documents (>80 headings) and skip pre-scroll getBoundingClientRect reflow
      const useInstant = headings.length > 80 || Math.abs(targetH.getBoundingClientRect().top) > 800;

      isNavigatingRef.current = true;
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      navTimerRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
      }, useInstant ? 120 : 850);

      setActiveHeadingIndex(originalIndex);
      targetH.scrollIntoView({
        behavior: useInstant ? 'auto' : 'smooth',
        block: 'start',
      });

      targetH.style.transition = 'background-color 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease';
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

  const renderHeadingRow = (h: { level: number; text: string; line: number; index: number }) => {
    const badgeColor = LEVEL_COLORS[h.level - 1] || 'text-zinc-600 dark:text-zinc-400';
    const isActiveItem = activeHeadingIndex === h.index;
    return (
      <div
        key={h.index}
        onClick={() => handleHeadingClick(h.text, h.index)}
        style={{ paddingLeft: `${(h.level - 1) * 10 + 6}px`, height: isVirtualized ? `${ROW_HEIGHT}px` : undefined }}
        className={`group relative flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer text-xs transition-colors ${
          isActiveItem
            ? 'bg-sky-100/90 border border-sky-300/90 text-sky-950 font-bold shadow-sm dark:bg-sky-500/15 dark:border-sky-500/40 dark:text-sky-300'
            : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-transparent hover:border-[var(--border-subtle)]'
        }`}
        title={`点击快速跳转至: ${h.text}`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {isActiveItem && (
            <div className="w-1.5 h-3.5 bg-sky-600 dark:bg-sky-400 rounded-full shrink-0 shadow-sm shadow-sky-500/50 -ml-1 mr-0.5" />
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
  };

  const overscan = 10;
  const startIdx = isVirtualized ? Math.max(0, Math.floor(scrollOffset / ROW_HEIGHT) - overscan) : 0;
  const endIdx = isVirtualized
    ? Math.min(filteredHeadings.length, Math.ceil((scrollOffset + viewportHeight) / ROW_HEIGHT) + overscan)
    : filteredHeadings.length;
  const visibleSlice = isVirtualized ? filteredHeadings.slice(startIdx, endIdx) : filteredHeadings;

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
      ) : isVirtualized ? (
        <div
          ref={listContainerRef}
          onScroll={(e) => setScrollOffset((e.currentTarget as HTMLDivElement).scrollTop)}
          className="max-h-[calc(100vh-145px)] overflow-y-auto pr-0.5"
        >
          <div style={{ height: `${filteredHeadings.length * ROW_HEIGHT}px`, position: 'relative' }}>
            <div style={{ transform: `translateY(${startIdx * ROW_HEIGHT}px)` }}>
              {visibleSlice.map(renderHeadingRow)}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-0.5">
          {visibleSlice.map(renderHeadingRow)}
        </div>
      )}
    </div>
  );
};
