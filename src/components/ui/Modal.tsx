/**
 * @file src/components/ui/Modal.tsx
 * @description 基于 @radix-ui/react-dialog 封装的通用模态框原语，统一管理遮罩层、焦点陷阱与键盘关闭
 * @module 通用 UI 组件库
 */
import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  align?: 'center' | 'top';
  maxWidthClass?: string;
  className?: string;
  overlayClassName?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title = 'MarkForge 对话框',
  align = 'center',
  maxWidthClass = 'max-w-md',
  className = '',
  overlayClassName = '',
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 ${overlayClassName}`}
        />
        <div
          onClick={onClose}
          className={`fixed inset-0 z-50 flex justify-center p-4 ${
            align === 'top' ? 'items-start pt-20' : 'items-center'
          }`}
        >
          <Dialog.Content
            ref={contentRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const focusTarget = contentRef.current?.querySelector<HTMLElement>(
                'input:not([disabled]), textarea:not([disabled]), [data-autofocus]'
              );
              (focusTarget || contentRef.current)?.focus();
            }}
            aria-describedby={undefined}
            className={`w-full ${maxWidthClass} bg-[var(--bg-header)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 outline-none focus:outline-none focus-visible:outline-none ${className}`}
          >
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
