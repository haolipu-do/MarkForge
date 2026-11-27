/**
 * @file src/components/AboutModal.tsx
 * @description “关于 MarkForge”信息模态框，展示软件版本、完全免费无内购声明及核心特性卡片
 * @module 模态弹窗模块
 */
import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { CURRENT_APP_VERSION } from '../data/changelog';
import { Modal } from './ui/Modal';
import { CloseButton } from './ui/CloseButton';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于 MarkForge" maxWidthClass="max-w-md">
      {/* Header decoration banner */}
      <div className="relative bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-transparent p-6 pb-4 border-b border-[var(--border-subtle)]">
        <CloseButton onClick={onClose} className="absolute top-4 right-4" />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-sky-500/20">
            M
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-heading)] flex items-center gap-2">
              MarkForge <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">{CURRENT_APP_VERSION}</span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">墨拓笔记 · 下一代 Markdown 极客工作台</p>
          </div>
        </div>
      </div>

      {/* Content body */}
      <div className="p-6 space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <div className="font-bold text-[13px] text-emerald-400">永久完全免费 · 免激活安装即用</div>
            <div className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
              MarkForge 摒弃任何收费许可证墙、机器码绑定与强制激活限制。无内购、无弹窗骚扰，完全离线可用，全力保障您的知识资产私有化。
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-[var(--text-heading)]">核心产品亮点</div>
          <ul className="space-y-1.5 text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span><strong className="text-[var(--text-primary)]">极致所见即所得 (IR)</strong>：输入即排版，无割裂无延迟。</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span><strong className="text-[var(--text-primary)]">高清晰度高对比度深色模式</strong>：对比度达 13.5:1，久看不累。</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span><strong className="text-[var(--text-primary)]">打字机与专注模式</strong>：光标平滑垂直居中，聚焦段落高亮。</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span><strong className="text-[var(--text-primary)]">专业级表格与图表</strong>：14 项表格操作与 Mermaid / KaTeX 引擎。</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span><strong className="text-[var(--text-primary)]">一键 Slide 演示</strong>：利用 <code className="text-sky-400 bg-sky-500/10 px-1 rounded">---</code> 秒变全屏演讲 PPT。</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--status-bar-bg)] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>基于 MIT 许可证自由发布</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
        >
          确定
        </button>
      </div>
    </Modal>
  );
};
