/**
 * @file src/components/SlideViewer.tsx
 * @description 全屏 Markdown 幻灯片演示视图，按 `---` 自动分页并提供键盘/按钮翻页控制
 * @module 幻灯片演示模块
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { CloseButton } from './ui/CloseButton';

interface SlideViewerProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  content,
  isOpen,
  onClose,
  theme,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Split content by '---'
  const slides = React.useMemo(() => {
    const rawSlides = content.split(/^---$/m).map(s => s.trim()).filter(Boolean);
    return rawSlides.length > 0 ? rawSlides : ['# 暂无内容\n使用 `---` 进行幻灯片切页'];
  }, [content]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, slides.length, onClose]);

  if (!isOpen) return null;

  const currentContent = slides[currentSlide] || '';

  // Simple markdown line formatter for slides
  const renderSlideContent = (markdown: string) => {
    const lines = markdown.split('\n');
    return (
      <div className="space-y-4 max-w-4xl w-full text-center">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-4xl sm:text-5xl font-black text-sky-400 tracking-tight my-4">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-2xl sm:text-3xl font-bold text-[var(--text-heading)] my-3">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] my-2">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote key={idx} className="p-4 rounded-xl bg-sky-500/10 border-l-4 border-sky-400 text-lg text-left text-zinc-200 my-4 mx-auto max-w-2xl">
                {trimmed.replace('> ', '')}
              </blockquote>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="text-lg sm:text-xl text-[var(--text-primary)] text-left max-w-xl mx-auto flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <span>{trimmed.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }
          return (
            <p key={idx} className="text-lg sm:text-xl text-[var(--text-primary)] leading-relaxed">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col justify-between p-8 select-none animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-400">MarkForge Slide View</span>
          <span>•</span>
          <span>快捷键: 空格/方向键切页, ESC 退出</span>
        </div>

        <CloseButton onClick={onClose} title="退出幻灯片 (ESC)" size="lg" />
      </div>

      {/* Main Slide Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {renderSlideContent(currentContent)}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
            disabled={currentSlide === 0}
            className="p-2 rounded-lg bg-[var(--bg-hover)] disabled:opacity-30 hover:text-sky-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-2 rounded-lg bg-[var(--bg-hover)] disabled:opacity-30 hover:text-sky-400 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm font-semibold tracking-wider text-[var(--text-muted)]">
          {currentSlide + 1} / {slides.length}
        </div>

        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full cursor-pointer transition-all ${
                i === currentSlide ? 'w-6 bg-sky-400' : 'w-2 bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
