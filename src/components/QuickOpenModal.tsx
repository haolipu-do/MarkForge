/**
 * @file src/components/QuickOpenModal.tsx
 * @description 基于 cmdk 实现的 Ctrl+P 快速打开命令面板，支持工作区文档递归模糊搜索与键盘定位打开
 * @module 模态弹窗模块
 */
import React, { useMemo } from 'react';
import { Command } from 'cmdk';
import { Search, FileText, CornerDownLeft } from 'lucide-react';
import { FileItem } from '../types/electron';
import { Modal } from './ui/Modal';

interface QuickOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileTree: FileItem[];
  onSelectFile: (filePath: string, fileName: string) => void;
  activeFilePath?: string;
}

interface FlatFile {
  name: string;
  path: string;
  dirName: string;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({
  isOpen,
  onClose,
  fileTree,
  onSelectFile,
  activeFilePath,
}) => {
  const flatFiles = useMemo(() => {
    const list: FlatFile[] = [];
    const traverse = (items: FileItem[], currentDir = '') => {
      for (const item of items) {
        if (item.isDirectory) {
          if (item.children) {
            traverse(item.children, currentDir ? `${currentDir}/${item.name}` : item.name);
          }
        } else {
          list.push({
            name: item.name,
            path: item.path,
            dirName: currentDir || '根目录',
          });
        }
      }
    };
    traverse(fileTree);
    return list;
  }, [fileTree]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="快速打开文档" align="top" maxWidthClass="max-w-xl" className="rounded-xl">
      <Command label="快速打开文档" className="w-full flex flex-col">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] gap-3">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <Command.Input
            autoFocus
            placeholder="快速打开文档 (输入文件名或路径进行搜索)..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-heading)] placeholder:text-[var(--text-muted)]"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[380px] overflow-y-auto p-1.5 space-y-0.5">
          <Command.Empty className="py-12 text-center text-xs text-[var(--text-muted)]">
            {flatFiles.length === 0 ? '当前工作区暂无已加载的文件' : '未匹配到相关文档'}
          </Command.Empty>

          {flatFiles.map((file) => {
            const isActive = file.path === activeFilePath;
            return (
              <Command.Item
                key={file.path}
                value={`${file.name} ${file.dirName} ${file.path}`}
                onSelect={() => {
                  onSelectFile(file.path, file.name);
                  onClose();
                }}
                className="group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors text-[var(--text-primary)] data-[selected=true]:bg-sky-500/15 data-[selected=true]:text-sky-400"
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-zinc-400 group-data-[selected=true]:text-sky-400" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-[11px] text-[var(--text-muted)] truncate">{file.dirName}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      当前打开
                    </span>
                  )}
                  <span className="hidden group-data-[selected=true]:flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                    <span>打开</span>
                    <CornerDownLeft className="w-3 h-3" />
                  </span>
                </div>
              </Command.Item>
            );
          })}
        </Command.List>

        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--status-bar-bg)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <span>共 {flatFiles.length} 个本地文档</span>
          <div className="flex items-center gap-3">
            <span>↑↓ 切换光标</span>
            <span>回车 打开</span>
            <span>ESC 取消</span>
          </div>
        </div>
      </Command>
    </Modal>
  );
};
