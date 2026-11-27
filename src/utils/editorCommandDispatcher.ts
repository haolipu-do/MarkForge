/**
 * @file src/utils/editorCommandDispatcher.ts
 * @description 统一分发编辑器内表格操作、右键上下文菜单指令及顶部菜单栏格式化命令
 * @module 编辑器命令分发模块
 */
import Vditor from 'vditor';
import {
  TableContext,
  getTableContext,
  insertTable,
  insertRowAbove,
  insertRowBelow,
  insertColLeft,
  insertColRight,
  moveRowUp,
  moveRowDown,
  moveColLeft,
  moveColRight,
  deleteCurrentRow,
  deleteCurrentCol,
  setColAlign,
  copyTableMarkdown,
  formatTableSource,
  deleteEntireTable,
} from './tableOperations';
import { openExternalLink, scrollToHeadingByAnchor } from './linkUtils';

export interface TableActionDeps {
  vditor: Vditor;
  onUpdate: (val: string) => void;
  openGridPicker: () => void;
  setTableContext: (ctx: TableContext) => void;
}

/** Dispatches unified table toolbar/shortcut/menu actions against a Vditor instance. */
export function dispatchTableAction(action: string, payload: any, deps: TableActionDeps) {
  const { vditor: vd, onUpdate, openGridPicker, setTableContext } = deps;

  switch (action) {
    case 'insert-table':
      if (payload?.rows && payload?.cols) insertTable(vd, payload.rows, payload.cols, onUpdate);
      else openGridPicker();
      break;
    case 'insert-row-above': insertRowAbove(vd, onUpdate); break;
    case 'insert-row-below': insertRowBelow(vd, onUpdate); break;
    case 'insert-col-left': insertColLeft(vd, onUpdate); break;
    case 'insert-col-right': insertColRight(vd, onUpdate); break;
    case 'move-row-up': moveRowUp(vd, onUpdate); break;
    case 'move-row-down': moveRowDown(vd, onUpdate); break;
    case 'move-col-left': moveColLeft(vd, onUpdate); break;
    case 'move-col-right': moveColRight(vd, onUpdate); break;
    case 'delete-row': deleteCurrentRow(vd, onUpdate); break;
    case 'delete-col': deleteCurrentCol(vd, onUpdate); break;
    case 'copy-table': copyTableMarkdown(vd); break;
    case 'format-table':
    case 'format-source': formatTableSource(vd, onUpdate); break;
    case 'delete-table': deleteEntireTable(vd, onUpdate); break;
    case 'set-align': if (payload) setColAlign(vd, payload, onUpdate); break;
    case 'align-left': setColAlign(vd, 'left', onUpdate); break;
    case 'align-center': setColAlign(vd, 'center', onUpdate); break;
    case 'align-right': setColAlign(vd, 'right', onUpdate); break;
    default: break;
  }

  setTableContext(getTableContext(vd));
}

export interface ContextCommandDeps {
  vditor: Vditor;
  editorContainer: HTMLDivElement | null;
  selectedText: string;
  openFindBar: (query?: string, showReplace?: boolean) => void;
  openGridPicker: () => void;
  getActiveEditorReset: () => HTMLElement | null;
  onChange: (val: string) => void;
  executeTableAction: (cmd: string, payload?: any) => void;
}

const TOOLBAR_FORWARD_CMDS = new Set([
  'bold', 'italic', 'strike', 'inline-code', 'link', 'quote', 'list', 'ordered-list', 'check',
]);

/** Dispatches right-click context menu commands for clipboard, formatting, links, and images. */
export function dispatchContextMenuCommand(command: string, payload: any, deps: ContextCommandDeps) {
  const {
    vditor,
    editorContainer,
    selectedText,
    openFindBar,
    openGridPicker,
    getActiveEditorReset,
    onChange,
    executeTableAction,
  } = deps;
  const internalVd = (vditor as any)?.vditor;

  const clickToolbar = (type: string, fallback?: () => void) => {
    const btn = editorContainer?.querySelector(`.vditor-toolbar button[data-type="${type}"]`) as HTMLElement | null;
    if (btn) btn.click();
    else fallback?.();
  };

  if (TOOLBAR_FORWARD_CMDS.has(command)) {
    clickToolbar(command);
    return;
  }

  if (command.startsWith('heading-')) {
    const level = parseInt(command.replace('heading-', ''), 10);
    window.dispatchEvent(new CustomEvent('markforge-heading-action', { detail: { level } }));
    return;
  }

  switch (command) {
    case 'local-search':
      openFindBar(payload?.text || selectedText || '', false);
      break;
    case 'cut':
      document.execCommand('cut');
      break;
    case 'copy':
      if (selectedText) navigator.clipboard.writeText(selectedText);
      else document.execCommand('copy');
      break;
    case 'paste':
    case 'paste-plain':
      navigator.clipboard.readText().then((clipText) => {
        if (clipText) vditor.insertValue(clipText);
      });
      break;
    case 'delete':
      if (selectedText) vditor.insertValue('');
      else document.execCommand('delete');
      break;
    case 'copy-plain':
      if (selectedText) {
        const plain = selectedText.replace(/[*_#`~>]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
        navigator.clipboard.writeText(plain);
      }
      break;
    case 'copy-markdown':
      if (selectedText) navigator.clipboard.writeText(selectedText);
      break;
    case 'copy-html':
      if (selectedText) {
        const lute = internalVd?.lute || (window as any).Lute?.NewLute();
        const html = lute ? lute.Md2HTML(selectedText) : selectedText;
        navigator.clipboard.writeText(html);
      }
      break;
    case 'highlight':
      vditor.insertValue(`==${selectedText || '高亮文本'}==`);
      break;
    case 'code-block':
      clickToolbar('code', () => vditor.insertValue('\n```javascript\n\n```\n'));
      break;
    case 'math-block':
      vditor.insertValue('\n$$\n\\sum_{i=1}^n x_i\n$$\n');
      break;
    case 'insert-table':
      openGridPicker();
      break;
    case 'insert-image':
      vditor.insertValue('![图片描述](./assets/image.png)');
      break;
    case 'insert-link':
      clickToolbar('link', () => vditor.insertValue('[链接文本](#锚点)'));
      break;
    case 'insert-line':
      clickToolbar('line', () => vditor.insertValue('\n---\n\n'));
      break;
    case 'insert-callout':
      vditor.insertValue(`\n> [!${payload || 'NOTE'}]\n> 这里是重要提示内容。\n\n`);
      break;
    case 'insert-toc':
      vditor.insertValue('\n[TOC]\n\n');
      break;
    case 'insert-emoji':
      vditor.insertValue('😄');
      break;
    case 'open-link': {
      const { href, text, isInternal } = payload || {};
      if (!href) break;
      if (isInternal || href.startsWith('#')) {
        scrollToHeadingByAnchor(href, text, getActiveEditorReset());
      } else {
        openExternalLink(href);
      }
      break;
    }
    case 'copy-link':
      if (payload?.href) navigator.clipboard.writeText(payload.href);
      break;
    case 'copy-link-text':
      if (payload?.text) navigator.clipboard.writeText(payload.text);
      break;
    case 'copy-image-url':
      if (payload?.src) navigator.clipboard.writeText(payload.src);
      break;
    case 'zoom-image':
    case 'convert-image-syntax': {
      if (!payload?.src) break;
      const currentVal = vditor.getValue();
      const escapedSrc = payload.src.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const mdRegex = new RegExp(`!\\[(.*?)\\]\\(${escapedSrc}\\)`, 'g');
      const htmlRegex = new RegExp(`<img[^>]*src=["']${escapedSrc}["'][^>]*>`, 'gi');
      let updated = currentVal;

      if (command === 'zoom-image' && payload.percent) {
        if (htmlRegex.test(updated)) {
          updated = updated.replace(htmlRegex, `<img src="${payload.src}" alt="${payload.alt || ''}" width="${payload.percent}" />`);
        } else if (mdRegex.test(updated)) {
          updated = updated.replace(mdRegex, `<img src="${payload.src}" alt="$1" width="${payload.percent}" />`);
        }
      } else if (command === 'convert-image-syntax') {
        if (htmlRegex.test(updated)) {
          updated = updated.replace(htmlRegex, `![${payload.alt || '图片'}](${payload.src})`);
        } else if (mdRegex.test(updated)) {
          updated = updated.replace(mdRegex, `<img src="${payload.src}" alt="$1" style="max-width: 100%;" />`);
        }
      }
      vditor.setValue(updated);
      onChange(updated);
      break;
    }
    default:
      executeTableAction(command, payload);
      break;
  }
}

export interface FormatActionDeps {
  vditor: Vditor;
  editorContainer: HTMLDivElement | null;
  applyHeading: (level: number) => void;
  onChange: (val: string) => void;
  toggleSourceMode: () => void;
}

const FORMAT_FORWARD_CMDS = new Set([
  'bold', 'italic', 'strike', 'inline-code', 'link', 'quote', 'list', 'ordered-list', 'check',
]);

/** Dispatches Header / menu bar formatting, heading adjustment, and copy actions. */
export function dispatchFormatAction(action: string, payload: any, deps: FormatActionDeps) {
  const { vditor: vd, editorContainer, applyHeading, onChange, toggleSourceMode } = deps;
  const resetEl = editorContainer?.querySelector('.vditor-reset') as HTMLElement | null;

  if (FORMAT_FORWARD_CMDS.has(action)) {
    const btn = editorContainer?.querySelector(`.vditor-toolbar button[data-type="${action}"]`) as HTMLElement | null;
    if (btn) btn.click();
    return;
  }

  const getSelectedText = () => window.getSelection()?.toString() || '';

  switch (action) {
    case 'underline':
      vd.insertValue(`<u>${getSelectedText() || '下划线文本'}</u>`);
      break;
    case 'inline-math':
      vd.insertValue(`$${getSelectedText() || 'E = mc^2'}$`);
      break;
    case 'highlight':
      vd.insertValue(`==${getSelectedText() || '高亮文本'}==`);
      break;
    case 'superscript':
      vd.insertValue(`^${getSelectedText() || '2'}^`);
      break;
    case 'subscript':
      vd.insertValue(`~${getSelectedText() || '2'}~`);
      break;
    case 'comment':
      vd.insertValue(`<!-- ${getSelectedText() || '注释内容'} -->`);
      break;
    case 'clear-format': {
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        const clean = sel.toString().replace(/[*_~=^`]/g, '').replace(/<\/?u>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
        vd.insertValue(clean);
      }
      break;
    }
    case 'increase-heading':
    case 'decrease-heading': {
      const anchor = window.getSelection()?.anchorNode;
      let hNode = (anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement) as HTMLElement | null;
      while (hNode && !/^H[1-6]$/i.test(hNode.tagName) && hNode.parentElement !== resetEl) {
        hNode = hNode.parentElement;
      }
      if (hNode && /^H[1-6]$/i.test(hNode.tagName)) {
        const cur = parseInt(hNode.tagName[1], 10);
        applyHeading(action === 'increase-heading' ? Math.max(1, cur - 1) : cur >= 6 ? 0 : cur + 1);
      } else if (action === 'increase-heading') {
        applyHeading(1);
      }
      break;
    }
    case 'insert-toc':
      vd.insertValue('\n[TOC]\n\n');
      break;
    case 'insert-yaml': {
      const currentVal = vd.getValue();
      if (!currentVal.startsWith('---')) {
        const yaml = `---\ntitle: ${payload?.title || '新文档'}\ndate: ${new Date().toISOString().slice(0, 10)}\ntags: []\n---\n\n`;
        vd.setValue(yaml + currentVal);
        onChange(yaml + currentVal);
      }
      break;
    }
    case 'toggle-task': {
      const node = window.getSelection()?.anchorNode;
      let li = (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement) as HTMLElement | null;
      while (li && li.tagName !== 'LI' && li !== resetEl) li = li.parentElement;
      const checkbox = li?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (checkbox) checkbox.click();
      break;
    }
    case 'jump-top':
      (editorContainer?.querySelector('.vditor-content') as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'jump-bottom': {
      const editorContent = editorContainer?.querySelector('.vditor-content') as HTMLElement | null;
      if (editorContent) editorContent.scrollTo({ top: editorContent.scrollHeight, behavior: 'smooth' });
      break;
    }
    case 'select-all':
      if (resetEl) {
        const range = document.createRange();
        range.selectNodeContents(resetEl);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      break;
    case 'copy-markdown': {
      const selText = window.getSelection()?.toString();
      navigator.clipboard.writeText(selText || vd.getValue());
      break;
    }
    case 'copy-plain': {
      const selText = window.getSelection()?.toString();
      const raw = selText || vd.getValue();
      navigator.clipboard.writeText(raw.replace(/[#*`~_=>[\]()$]/g, '').trim());
      break;
    }
    case 'copy-html':
      navigator.clipboard.writeText(resetEl?.innerHTML || '');
      break;
    case 'toggle-view-mode':
      toggleSourceMode();
      break;
    default:
      break;
  }
}
