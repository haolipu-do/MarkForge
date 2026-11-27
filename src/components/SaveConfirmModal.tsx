/**
 * @file src/components/SaveConfirmModal.tsx
 * @description 未保存文档关闭拦截确认弹窗，提供保存、放弃更改或取消关闭三项操作
 * @module 模态弹窗模块
 */
import React, { useEffect, useRef } from 'react';
import { Modal } from './ui/Modal';

interface SaveConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
}

export const SaveConfirmModal: React.FC<SaveConfirmModalProps> = ({
  isOpen,
  fileName,
  onSave,
  onDiscard,
  onCancel,
}) => {
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      saveBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
        e.preventDefault();
        e.stopPropagation();
        onSave();
      } else if (e.key.toLowerCase() === 'd' && (e.altKey || !e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        onDiscard();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onSave, onDiscard]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="保存"
      maxWidthClass="w-[440px] max-w-[92vw]"
      overlayClassName="bg-black/40 backdrop-blur-[2px]"
      className="bg-white dark:bg-[#1f1f23] border-zinc-200 dark:border-zinc-700 rounded-lg p-6 text-zinc-900 dark:text-zinc-100 select-none"
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">保存</h3>

      <div className="space-y-1.5 mb-7">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-normal">
          是否保存对 “<span className="text-sky-600 dark:text-sky-400 font-semibold">{fileName}</span>” 的更改？
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          如果不保存，您的更改将会丢失。
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <button
            ref={saveBtnRef}
            type="button"
            onClick={onSave}
            className="px-5 py-1.5 text-xs font-medium rounded bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-[#1f1f23] cursor-pointer"
          >
            保存
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-1.5 text-xs font-medium rounded bg-zinc-100 hover:bg-zinc-200 active:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-rose-400 border border-zinc-300 dark:border-zinc-600 transition-all focus:outline-none focus:ring-2 focus:ring-rose-400/50 cursor-pointer"
            title="放弃修改并关闭 (D)"
          >
            丢弃
          </button>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-1.5 text-xs font-medium rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 cursor-pointer"
          title="取消并返回编辑 (Esc)"
        >
          取消
        </button>
      </div>
    </Modal>
  );
};
