/**
 * @file src/components/context-menu/LinkAndImageActions.tsx
 * @description 右键菜单中针对超链接（打开/复制地址/复制文本）与图片（缩放尺寸/HTML语法转换/复制链接）的专用操作区
 * @module 编辑器右键菜单模块
 */
import React from 'react';
import { Compass, ExternalLink, Copy, Clipboard, Image as ImageIcon, Code } from 'lucide-react';

interface LinkAndImageActionsProps {
  targetLink: { href: string; text: string; isInternal?: boolean } | null;
  targetImage: { src: string; alt: string } | null;
  onAction: (command: string, payload?: any) => void;
}

export const LinkAndImageActions: React.FC<LinkAndImageActionsProps> = ({
  targetLink,
  targetImage,
  onAction,
}) => (
  <>
    {targetLink && (
      <div className="mb-1.5 pb-1.5 border-b border-zinc-200 dark:border-white/10 space-y-0.5">
        <button
          onClick={() => onAction('open-link', targetLink)}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-sky-500/15 text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 text-xs flex items-center justify-between font-medium group transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {targetLink.href.startsWith('#') || targetLink.isInternal ? (
              <Compass className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0" />
            )}
            <span className="truncate max-w-[145px]">
              {targetLink.href.startsWith('#') || targetLink.isInternal ? '跳转至对应目录内容' : '打开链接'}
            </span>
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider ml-1.5 flex-shrink-0">
            Ctrl+点击
          </span>
        </button>

        <button
          onClick={() => onAction('copy-link', { href: targetLink.href })}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
            <span>复制链接地址</span>
          </span>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-[90px] font-mono">
            {targetLink.href}
          </span>
        </button>

        {targetLink.text && targetLink.text !== targetLink.href && (
          <button
            onClick={() => onAction('copy-link-text', { text: targetLink.text })}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clipboard className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
              <span>复制链接文本</span>
            </span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate max-w-[90px]">
              {targetLink.text}
            </span>
          </button>
        )}
      </div>
    )}

    {targetImage && (
      <div className="mb-1.5 p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-1">
        <div className="text-[10px] text-purple-400 font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            图片资源与排版
          </span>
          <span className="text-[9px] text-purple-300/70 truncate max-w-[120px]">{targetImage.alt || '图像'}</span>
        </div>
        <button
          onClick={() => onAction('copy-image-url', { src: targetImage.src })}
          className="w-full text-left px-2 py-1 rounded hover:bg-purple-500/20 text-purple-200 text-xs flex items-center justify-between"
        >
          <span>复制图片路径 / 标签</span>
          <Copy className="w-3 h-3 opacity-70" />
        </button>
        <div className="flex items-center gap-1 px-1 py-0.5">
          <span className="text-[10px] text-zinc-400">缩放:</span>
          {['25%', '50%', '75%', '100%'].map(pct => (
            <button
              key={pct}
              onClick={() => onAction('zoom-image', { src: targetImage.src, alt: targetImage.alt, percent: pct })}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 transition-colors"
            >
              {pct}
            </button>
          ))}
        </div>
        <button
          onClick={() => onAction('convert-image-syntax', { src: targetImage.src, alt: targetImage.alt })}
          className="w-full text-left px-2 py-1 rounded hover:bg-purple-500/20 text-purple-200 text-xs flex items-center justify-between"
        >
          <span>切换 Markdown / HTML 标签</span>
          <Code className="w-3 h-3 opacity-70" />
        </button>
      </div>
    )}
  </>
);
