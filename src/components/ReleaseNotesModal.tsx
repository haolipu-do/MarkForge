/**
 * @file src/components/ReleaseNotesModal.tsx
 * @description 版本更新日志模态框，支持历史版本时间线切换及按功能/修复/性能分类筛选展示
 * @module 模态弹窗模块
 */
import React, { useState } from 'react';
import { Sparkles, Check, Copy, Flame, Wrench, Zap, Tag, Calendar, ChevronRight } from 'lucide-react';
import { CHANGELOG_DATA, ReleaseVersion, ReleaseFeature } from '../data/changelog';
import { Modal } from './ui/Modal';
import { CloseButton } from './ui/CloseButton';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(CHANGELOG_DATA[0]?.version || 'v1.0.0');
  const [activeFilter, setActiveFilter] = useState<'all' | 'feature' | 'fix' | 'perf'>('all');
  const [copied, setCopied] = useState(false);

  const currentRelease: ReleaseVersion = CHANGELOG_DATA.find(r => r.version === selectedVersion) || CHANGELOG_DATA[0];

  const filteredFeatures = activeFilter === 'all'
    ? currentRelease.features
    : currentRelease.features.filter(f => f.type === activeFilter);

  const handleCopyChangelog = () => {
    const text = [
      `# MarkForge ${currentRelease.version} 更新日志 (${currentRelease.date})`,
      `${currentRelease.title} · ${currentRelease.slogan}\n`,
      `## 核心里程碑亮点`,
      currentRelease.highlights.map(h => `- ${h}`).join('\n'),
      `\n## 版本功能明细`,
      currentRelease.features.map(item => `### [${item.category}] ${item.title}\n${item.desc}`).join('\n\n'),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const featureTypeBadge = (type: ReleaseFeature['type'], category: string) => {
    switch (type) {
      case 'feature':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1 shrink-0">
            <Flame className="w-2.5 h-2.5" /> {category}
          </span>
        );
      case 'fix':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 shrink-0">
            <Wrench className="w-2.5 h-2.5" /> {category}
          </span>
        );
      case 'perf':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
            <Zap className="w-2.5 h-2.5" /> {category}
          </span>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="MarkForge 更新日志" maxWidthClass="max-w-2xl" className="max-h-[85vh]">
      <div className="relative bg-gradient-to-br from-amber-500/20 via-sky-600/10 to-transparent p-5 pb-4 border-b border-[var(--border-subtle)] shrink-0">
        <CloseButton onClick={onClose} className="absolute top-4 right-4" />

        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-sky-500 to-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-sky-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-heading)] flex items-center gap-2">
                <span>MarkForge 更新日志</span>
                {currentRelease.isLatest && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" /> 最新发版
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                记录每一次发版与功能演进 · 保障稳定、快速与极致创作体验
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyChangelog}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
            title="复制当前版本 Markdown 格式更新日志"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />}
            <span>{copied ? '已复制' : '复制日志'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Version Timeline Selector Bar */}
      <div className="px-5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--status-bar-bg)] flex items-center justify-between gap-3 text-xs overflow-x-auto shrink-0 select-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[var(--text-muted)] text-[11px] font-medium mr-1 shrink-0">版本选择:</span>
          {CHANGELOG_DATA.map(rel => {
            const isSelected = rel.version === selectedVersion;
            return (
              <button
                key={rel.version}
                onClick={() => {
                  setSelectedVersion(rel.version);
                  setActiveFilter('all');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
                }`}
              >
                <span>{rel.version}</span>
                {rel.isLatest && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px] font-mono shrink-0">
          <Calendar className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>发布日期: {currentRelease.date}</span>
        </div>
      </div>

      {/* Feature Type Filter Bar */}
      <div className="px-5 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs bg-[var(--bg-header)] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--text-muted)] text-[11px] mr-1">类型筛选:</span>
          {[
            { id: 'all', label: '全部' },
            { id: 'feature', label: '新功能' },
            { id: 'fix', label: '问题修复' },
            { id: 'perf', label: '体验优化' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-2.5 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-[var(--bg-hover)] text-sky-500 dark:text-sky-400 font-semibold border border-sky-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[var(--text-muted)]">
          共 {filteredFeatures.length} 项更新
        </span>
      </div>

      {/* Scrollable Content Body */}
      <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/25 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm text-[var(--text-heading)] flex items-center gap-2">
              <span>{currentRelease.version}</span>
              <span className="text-xs text-sky-500 dark:text-sky-400 font-medium">· {currentRelease.title}</span>
            </h3>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">{currentRelease.date}</span>
          </div>
          <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
            {currentRelease.slogan}
          </p>

          {currentRelease.highlights.length > 0 && (
            <div className="pt-2 border-t border-sky-500/20 mt-2 space-y-1">
              <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>核心更新要点</span>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                {currentRelease.highlights.map((hl, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[var(--text-primary)] text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            版本功能清单
          </div>

          <div className="grid grid-cols-1 gap-2">
            {filteredFeatures.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[var(--bg-editor)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-[var(--text-heading)] text-[12px] flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-sky-500 dark:text-sky-400 shrink-0" />
                    <span>{item.title}</span>
                  </h4>
                  {featureTypeBadge(item.type, item.category)}
                </div>
                <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed pl-4">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--status-bar-bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>MarkForge · 每次构建均严格遵循语义化版本发布规范</span>
        </div>
        <button
          onClick={onClose}
          className="px-5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
        >
          确定
        </button>
      </div>
    </Modal>
  );
};
