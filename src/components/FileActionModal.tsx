/**
 * @file src/components/FileActionModal.tsx
 * @description 替代原生 prompt 的现代化工作区文件操作弹窗，支持新建文件、新建文件夹、重命名与删除确认
 * @module 模态弹窗模块
 */
import React, { useState, useEffect, useRef } from 'react';
import { FilePlus, FolderPlus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { CloseButton } from './ui/CloseButton';

export type FileActionMode = 'create-file' | 'create-folder' | 'rename' | 'delete';

export interface FileActionModalProps {
  isOpen: boolean;
  mode: FileActionMode;
  targetPath: string;
  defaultName?: string;
  itemType?: 'file' | 'folder';
  onConfirm: (name: string) => void | Promise<void>;
  onClose: () => void;
}

const INVALID_CHARS_REGEX = /[\\/:*?"<>|]/;

export const FileActionModal: React.FC<FileActionModalProps> = ({
  isOpen,
  mode,
  targetPath,
  defaultName = '',
  itemType = 'file',
  onConfirm,
  onClose,
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let initialVal = defaultName;
    if (mode === 'create-file') {
      initialVal = defaultName || '新建文档.md';
    } else if (mode === 'create-folder') {
      initialVal = defaultName || '新建文件夹';
    }
    setValue(initialVal);
    setError(null);

    const timer = setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      if (initialVal.toLowerCase().endsWith('.md')) {
        const dotIndex = initialVal.lastIndexOf('.');
        el.setSelectionRange(0, dotIndex > 0 ? dotIndex : initialVal.length);
      } else {
        el.select();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, mode, defaultName]);

  const validate = (val: string): boolean => {
    const trimmed = val.trim();
    if (mode !== 'delete') {
      if (!trimmed) {
        setError('名称不能为空');
        return false;
      }
      if (INVALID_CHARS_REGEX.test(trimmed)) {
        setError('名称不能包含以下非法字符: \\ / : * ? " < > |');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    validate(next);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate(value)) return;

    let finalName = value.trim();
    if (mode === 'create-file') {
      if (!finalName.toLowerCase().endsWith('.md') && !finalName.toLowerCase().endsWith('.markdown')) {
        finalName = `${finalName}.md`;
      }
    }
    onConfirm(finalName);
  };

  let title = '文件操作';
  let Icon = FilePlus;
  let iconColor = 'text-sky-400';
  let confirmBtnText = '确定';
  let confirmBtnColor = 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white';

  if (mode === 'create-file') {
    title = '新建 Markdown 文件';
    Icon = FilePlus;
    iconColor = 'text-sky-400';
    confirmBtnText = '创建文件';
  } else if (mode === 'create-folder') {
    title = '新建子文件夹';
    Icon = FolderPlus;
    iconColor = 'text-amber-400';
    confirmBtnText = '创建文件夹';
    confirmBtnColor = 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white';
  } else if (mode === 'rename') {
    title = `重命名${itemType === 'folder' ? '文件夹' : '文件'}`;
    Icon = Edit2;
    iconColor = 'text-indigo-400';
    confirmBtnText = '确认重命名';
  } else if (mode === 'delete') {
    title = `删除${itemType === 'folder' ? '文件夹' : '文件'}`;
    Icon = Trash2;
    iconColor = 'text-rose-400';
    confirmBtnText = '确认删除';
    confirmBtnColor = 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white';
  }

  const targetFolderDisplay = targetPath.split(/[\\/]/).pop() || targetPath;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidthClass="w-[420px] max-w-[92vw]"
      overlayClassName="bg-black/50 backdrop-blur-[2px]"
      className="bg-[#1a1b20] border-zinc-700/70 rounded-xl p-5 text-zinc-100 font-sans select-none"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[280px]">
              目标位置: <span className="text-zinc-300 font-mono">📁 {targetFolderDisplay}</span>
            </p>
          </div>
        </div>

        <CloseButton
          onClick={onClose}
          size="sm"
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          iconClassName="w-4 h-4"
        />
      </div>

      {mode === 'delete' ? (
        <div className="py-2 mb-5">
          <p className="text-xs text-zinc-300 leading-relaxed">
            确定要删除 <span className="text-rose-400 font-semibold font-mono">“{defaultName}”</span> 吗？
          </p>
          <p className="text-[11px] text-zinc-500 mt-1.5">
            该文件将被移至系统回收站，如有需要可随时还原。
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-5 space-y-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
              {mode === 'create-file' ? '文件名 (可直接按回车创建)' : mode === 'create-folder' ? '文件夹名称' : '新名称'}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              placeholder={mode === 'create-file' ? '例如：笔记.md' : '请输入名称'}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-zinc-100 placeholder-zinc-500 outline-none transition-all font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 pt-0.5 animate-in fade-in duration-100">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={mode !== 'delete' && (!value.trim() || !!error)}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg shadow-sm transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${confirmBtnColor}`}
        >
          {confirmBtnText}
        </button>
      </div>
    </Modal>
  );
};
