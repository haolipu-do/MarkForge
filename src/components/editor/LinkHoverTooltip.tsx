/**
 * @file src/components/editor/LinkHoverTooltip.tsx
 * @description 悬停文档内部章节锚点或外部超链接时展示的 Ctrl+单击跳转引导悬浮气泡
 * @module 核心编辑器子组件
 */
import React from 'react';
import { Compass, ExternalLink } from 'lucide-react';
import { Kbd } from '../ui/Kbd';

export interface HoverLinkTooltipState {
  visible: boolean;
  x: number;
  y: number;
  href: string;
  text: string;
  isInternal: boolean;
}

/** Floating Ctrl+Click guidance tooltip shown when hovering internal or external links. */
export const LinkHoverTooltip: React.FC<{ tooltip: HoverLinkTooltipState | null }> = ({ tooltip }) => {
  if (!tooltip || !tooltip.visible) return null;

  return (
    <div
      style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
      className="fixed z-[99999] pointer-events-none px-2.5 py-1.5 rounded-lg text-xs font-sans shadow-xl border border-sky-500/30 bg-zinc-900/95 text-zinc-100 backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100"
    >
      {tooltip.isInternal ? (
        <>
          <Compass className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="text-zinc-300">
            按住 <Kbd className="bg-zinc-800 border-zinc-700 text-sky-300">Ctrl</Kbd> 单击跳转至章节
          </span>
          <span className="text-sky-300 font-medium truncate max-w-[150px]">
            "{tooltip.text}"
          </span>
        </>
      ) : (
        <>
          <ExternalLink className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span className="text-zinc-300">
            按住 <Kbd className="bg-zinc-800 border-zinc-700 text-sky-300">Ctrl</Kbd> 单击在浏览器中打开:
          </span>
          <span className="text-sky-300 underline underline-offset-2 max-w-[180px] truncate font-mono text-[11px]">
            {tooltip.href}
          </span>
        </>
      )}
    </div>
  );
};
