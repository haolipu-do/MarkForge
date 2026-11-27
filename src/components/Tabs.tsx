/**
 * @file src/components/Tabs.tsx
 * @description 多文档顶部标签页切换栏，支持切换、未保存圆点提示、新建文档标签及中键/按钮关闭
 * @module 多标签页模块
 */
import React from 'react';
import { FileText, Plus, X } from 'lucide-react';

export interface TabItem {
  id: string;
  name: string;
  path?: string;
  content: string;
  isDirty?: boolean;
  scrollTop?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div 
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) onNewTab();
      }}
      onWheel={(e) => {
        if (e.currentTarget) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
      className="flex items-center bg-[var(--bg-sidebar)] border-b border-[var(--border-subtle)] px-2 pt-1.5 overflow-x-auto select-none no-scrollbar"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            onMouseDown={(e) => {
              // Middle click to close tab
              if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                onCloseTab(tab.id, e);
              }
            }}
            className={`group relative flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer transition-all border-t border-x ${
              isActive
                ? 'bg-[var(--bg-canvas)] text-[var(--text-heading)] font-medium border-[var(--border-subtle)] border-b-transparent shadow-sm'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-transparent'
            }`}
            style={{ maxWidth: '200px' }}
            title={tab.path || tab.name}
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-500'}`} />
            <span className="truncate">{tab.name}</span>

            {/* Dirty indicator / Close button */}
            <div className="flex items-center ml-1">
              {tab.isDirty && (
                <span className="w-2 h-2 rounded-full bg-sky-600 dark:bg-sky-400 group-hover:hidden" />
              )}
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className={`p-0.5 rounded-full hover:bg-[var(--bg-hover)] text-zinc-400 hover:text-zinc-200 transition-colors ${
                  tab.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="关闭标签 (Ctrl+W 或 鼠标中键)"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        className="p-1 ml-1 text-zinc-400 hover:text-zinc-200 hover:bg-[var(--bg-hover)] rounded transition-colors"
        title="新建文档 (Ctrl+N，或双击标签栏空白)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
