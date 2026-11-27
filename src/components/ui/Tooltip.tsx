/**
 * @file src/components/ui/Tooltip.tsx
 * @description 基于 @radix-ui/react-tooltip 封装的悬浮提示组件与全局 Provider
 * @module 通用 UI 组件库
 */
import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

export const TooltipProvider = RadixTooltip.Provider;

interface TooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  delayDuration = 350,
  children,
}) => {
  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={10}
          className="context-menu-tooltip z-[9999999] px-2.5 py-1.5 rounded-lg text-[11px] font-medium leading-snug max-w-[240px] select-none animate-in fade-in zoom-in-95 duration-100"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
