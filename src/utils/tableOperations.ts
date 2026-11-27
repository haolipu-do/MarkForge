/**
 * @file src/utils/tableOperations.ts
 * @description MarkForge 表格操作引擎，提供上下文解析、行列增删/移动、列对齐、源码格式化及 Tab 跳格等 14 项表格编辑能力
 * @module 表格编辑工具引擎
 */

export interface TableContext {
  inTable: boolean;
  table: HTMLTableElement | null;
  thead: HTMLTableSectionElement | null;
  tbody: HTMLTableSectionElement | null;
  tr: HTMLTableRowElement | null;
  cell: HTMLTableCellElement | null;
  rowIndex: number;     // 0-based across all rows (0 is thead tr)
  bodyRowIndex: number; // 0-based in tbody (-1 if in thead)
  colIndex: number;     // 0-based column index
  isHeader: boolean;
  totalRows: number;
  totalCols: number;
  currentAlign: 'left' | 'center' | 'right' | '';
}

/**
 * 辅助测量字符的实际显示视觉宽度（中文、全角字符计 2，ASCII 计 1）
 */
export function getDisplayWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3000 && code <= 0x303f)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 按视觉宽度进行对齐填充
 */
export function padDisplay(
  str: string,
  targetWidth: number,
  align: 'left' | 'center' | 'right' = 'left'
): string {
  const currentWidth = getDisplayWidth(str);
  const diff = Math.max(0, targetWidth - currentWidth);
  if (align === 'right') {
    return ' '.repeat(diff) + str;
  }
  if (align === 'center') {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  }
  return str + ' '.repeat(diff);
}

/**
 * 精准检测当前光标或选区是否处于表格内，并解析行列索引与结构上下文
 */
export function getTableContext(vditor?: any, customRange?: Range | null): TableContext {
  const emptyContext: TableContext = {
    inTable: false,
    table: null,
    thead: null,
    tbody: null,
    tr: null,
    cell: null,
    rowIndex: -1,
    bodyRowIndex: -1,
    colIndex: -1,
    isHeader: false,
    totalRows: 0,
    totalCols: 0,
    currentAlign: '',
  };

  const sel = window.getSelection();
  let range = customRange || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
  if (!range && vditor?.vditor?.ir?.range) {
    range = vditor.vditor.ir.range;
  }
  if (!range) return emptyContext;

  const node = range.startContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  if (!element) return emptyContext;

  const cell = element.closest('th, td') as HTMLTableCellElement | null;
  if (!cell) return emptyContext;

  const tr = cell.closest('tr') as HTMLTableRowElement | null;
  const table = cell.closest('table') as HTMLTableElement | null;
  if (!tr || !table) return emptyContext;

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');

  const rows = Array.from(table.rows);
  const rowIndex = rows.indexOf(tr);
  const colIndex = Array.from(tr.children).indexOf(cell);
  const isHeader = cell.tagName.toLowerCase() === 'th';
  const bodyRows = tbody ? Array.from(tbody.rows) : [];
  const bodyRowIndex = isHeader ? -1 : bodyRows.indexOf(tr);
  const totalRows = rows.length;
  const totalCols = tr.cells.length || table.rows[0]?.cells.length || 0;
  const currentAlign = (cell.getAttribute('align') as 'left' | 'center' | 'right' | '') || '';

  return {
    inTable: true,
    table,
    thead,
    tbody,
    tr,
    cell,
    rowIndex,
    bodyRowIndex,
    colIndex,
    isHeader,
    totalRows,
    totalCols,
    currentAlign,
  };
}

/**
 * 将光标平滑聚焦到指定单元格，并置于末尾或开头
 */
export function focusTableCell(cell: HTMLElement | null, collapseToEnd = true) {
  if (!cell) return;
  try {
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(!collapseToEnd);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    cell.focus();
  } catch (err) {
    console.warn('focusTableCell failed:', err);
  }
}

/**
 * 触发编辑器状态同步与 Undo 栈沉淀
 */
export function syncTableChange(vditor: any, onContentChange?: (val: string) => void) {
  if (!vditor) return;
  const vd = vditor.vditor || vditor;
  const irElement = vd.ir?.element;

  if (irElement) {
    irElement.dispatchEvent(new Event('input', { bubbles: true }));
  }

  try {
    const val = vditor.getValue ? vditor.getValue() : vd.lute?.VditorIRDOM2Md(irElement?.innerHTML || '');
    if (typeof onContentChange === 'function') {
      onContentChange(val);
    }
  } catch (err) {
    console.warn('syncTableChange error:', err);
  }

  if (vd.undo) {
    vd.undo.addToUndoStack(vd);
  }
}

/**
 * 1. 插入指定行列的表格 (Insert Table) - 默认 Ctrl+T
 */
export function insertTable(
  vditor: any,
  rows = 3,
  cols = 3,
  onContentChange?: (val: string) => void
) {
  if (!vditor) return;
  const safeCols = Math.max(1, Math.min(20, cols));
  const safeRows = Math.max(1, Math.min(50, rows));

  const headers = Array.from({ length: safeCols }, (_, i) => `表头 ${i + 1}`);
  const separators = Array.from({ length: safeCols }, () => ':---');

  const lines: string[] = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${separators.join(' | ')} |`);

  for (let r = 0; r < safeRows; r++) {
    const rowCells = Array.from({ length: safeCols }, () => ' ');
    lines.push(`| ${rowCells.join(' | ')} |`);
  }

  const tableMd = '\n\n' + lines.join('\n') + '\n\n';

  if (typeof vditor.insertValue === 'function') {
    vditor.insertValue(tableMd);
  }

  setTimeout(() => {
    syncTableChange(vditor, onContentChange);
  }, 50);
}

/**
 * 2. 上方插入行 (Insert Row Above)
 */
export function insertRowAbove(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table || !ctx.tr) return false;

  const colCount = ctx.totalCols || ctx.tr.cells.length;
  const newTr = document.createElement('tr');

  for (let c = 0; c < colCount; c++) {
    const align = ctx.table.rows[0]?.cells[c]?.getAttribute('align') || 'left';
    const td = document.createElement('td');
    if (align) td.setAttribute('align', align);
    td.textContent = '\u200B';
    newTr.appendChild(td);
  }

  if (ctx.isHeader) {
    if (ctx.tbody) {
      ctx.tbody.insertAdjacentElement('afterbegin', newTr);
    } else {
      const newTbody = document.createElement('tbody');
      newTbody.appendChild(newTr);
      ctx.table.appendChild(newTbody);
    }
  } else {
    ctx.tr.insertAdjacentElement('beforebegin', newTr);
  }

  focusTableCell(newTr.cells[Math.min(ctx.colIndex, colCount - 1)] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 3. 下方插入行 (Insert Row Below) - Ctrl+Enter
 */
export function insertRowBelow(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table || !ctx.tr) return false;

  const colCount = ctx.totalCols || ctx.tr.cells.length;
  const newTr = document.createElement('tr');

  for (let c = 0; c < colCount; c++) {
    const align = ctx.table.rows[0]?.cells[c]?.getAttribute('align') || 'left';
    const td = document.createElement('td');
    if (align) td.setAttribute('align', align);
    td.textContent = '\u200B';
    newTr.appendChild(td);
  }

  if (ctx.isHeader) {
    if (ctx.tbody) {
      ctx.tbody.insertAdjacentElement('afterbegin', newTr);
    } else {
      const newTbody = document.createElement('tbody');
      newTbody.appendChild(newTr);
      ctx.table.appendChild(newTbody);
    }
  } else {
    ctx.tr.insertAdjacentElement('afterend', newTr);
  }

  focusTableCell(newTr.cells[0] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 4. 左侧插入列 (Insert Column Left)
 */
export function insertColLeft(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  const targetCol = Math.max(0, ctx.colIndex);

  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    const isFirstRow = r === 0 && row.parentElement?.tagName.toLowerCase() === 'thead';
    const newCell = document.createElement(isFirstRow ? 'th' : 'td');
    newCell.setAttribute('align', 'left');
    newCell.textContent = '\u200B';

    const refCell = row.cells[targetCol];
    if (refCell) {
      row.insertBefore(newCell, refCell);
    } else {
      row.appendChild(newCell);
    }
  }

  const currentTr = ctx.tr || ctx.table.rows[0];
  focusTableCell(currentTr.cells[targetCol] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 5. 右侧插入列 (Insert Column Right)
 */
export function insertColRight(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  const insertIndex = ctx.colIndex + 1;

  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    const isFirstRow = r === 0 && row.parentElement?.tagName.toLowerCase() === 'thead';
    const newCell = document.createElement(isFirstRow ? 'th' : 'td');
    newCell.setAttribute('align', 'left');
    newCell.textContent = '\u200B';

    const refCell = row.cells[insertIndex];
    if (refCell) {
      row.insertBefore(newCell, refCell);
    } else {
      row.appendChild(newCell);
    }
  }

  const currentTr = ctx.tr || ctx.table.rows[0];
  focusTableCell(currentTr.cells[insertIndex] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 6. 上移该行 (Move Row Up) - Alt+ArrowUp
 */
export function moveRowUp(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.tr || !ctx.tbody) return false;
  if (ctx.isHeader) return false; // 表头行不可上移

  const prevTr = ctx.tr.previousElementSibling as HTMLTableRowElement | null;
  if (!prevTr) return false;

  ctx.tbody.insertBefore(ctx.tr, prevTr);
  focusTableCell(ctx.tr.cells[ctx.colIndex] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 7. 下移该行 (Move Row Down) - Alt+ArrowDown
 */
export function moveRowDown(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.tr || !ctx.tbody) return false;
  if (ctx.isHeader) return false; // 表头行不可下移

  const nextTr = ctx.tr.nextElementSibling as HTMLTableRowElement | null;
  if (!nextTr) return false;

  ctx.tbody.insertBefore(nextTr, ctx.tr);
  focusTableCell(ctx.tr.cells[ctx.colIndex] as HTMLElement);
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 8. 左移该列 (Move Column Left) - Alt+ArrowLeft
 */
export function moveColLeft(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table || ctx.colIndex <= 0) return false;

  const c = ctx.colIndex;
  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    const cell = row.cells[c];
    const prevCell = row.cells[c - 1];
    if (cell && prevCell) {
      row.insertBefore(cell, prevCell);
    }
  }

  if (ctx.tr) {
    focusTableCell(ctx.tr.cells[c - 1] as HTMLElement);
  }
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 9. 右移该列 (Move Column Right) - Alt+ArrowRight
 */
export function moveColRight(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table || ctx.colIndex >= ctx.totalCols - 1) return false;

  const c = ctx.colIndex;
  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    const cell = row.cells[c];
    const nextCell = row.cells[c + 1];
    if (cell && nextCell) {
      row.insertBefore(nextCell, cell);
    }
  }

  if (ctx.tr) {
    focusTableCell(ctx.tr.cells[c + 1] as HTMLElement);
  }
  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 10. 删除行 (Delete Row) - Ctrl+Shift+Backspace
 */
export function deleteCurrentRow(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table || !ctx.tr) return false;

  // 若整表只剩最后一行，删除整张表格
  if (ctx.totalRows <= 1) {
    return deleteEntireTable(vditor, onContentChange);
  }

  if (ctx.isHeader) {
    // 若删除表头行，将 tbody 第一行提升为新的表头
    if (ctx.tbody && ctx.tbody.rows.length > 0) {
      const firstBodyRow = ctx.tbody.rows[0];
      const newHeaderCells = Array.from(firstBodyRow.cells).map(td => {
        const th = document.createElement('th');
        th.innerHTML = td.innerHTML;
        const align = td.getAttribute('align');
        if (align) th.setAttribute('align', align);
        return th;
      });
      ctx.tr.innerHTML = '';
      newHeaderCells.forEach(th => ctx.tr?.appendChild(th));
      firstBodyRow.remove();
      focusTableCell(ctx.tr.cells[Math.min(ctx.colIndex, ctx.tr.cells.length - 1)] as HTMLElement);
    } else {
      return deleteEntireTable(vditor, onContentChange);
    }
  } else {
    // 普通 tbody 行删除
    const targetTr = ctx.tr.nextElementSibling || ctx.tr.previousElementSibling || ctx.thead?.rows[0];
    ctx.tr.remove();
    if (targetTr) {
      const focusIndex = Math.min(ctx.colIndex, (targetTr as HTMLTableRowElement).cells.length - 1);
      focusTableCell((targetTr as HTMLTableRowElement).cells[focusIndex] as HTMLElement);
    }
  }

  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 11. 删除列 (Delete Column)
 */
export function deleteCurrentCol(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  // 若整表只剩 1 列，直接删除整表
  if (ctx.totalCols <= 1) {
    return deleteEntireTable(vditor, onContentChange);
  }

  const c = ctx.colIndex;
  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    if (row.cells[c]) {
      row.cells[c].remove();
    }
  }

  if (ctx.tr) {
    const nextCol = Math.min(c, ctx.tr.cells.length - 1);
    focusTableCell(ctx.tr.cells[nextCol] as HTMLElement);
  }

  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 设置列对齐方式 (左对齐 / 居中 / 右对齐)
 */
export function setColAlign(
  vditor: any,
  align: 'left' | 'center' | 'right',
  onContentChange?: (val: string) => void
): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  const c = ctx.colIndex;
  for (let r = 0; r < ctx.table.rows.length; r++) {
    const row = ctx.table.rows[r];
    if (row.cells[c]) {
      row.cells[c].setAttribute('align', align);
    }
  }

  if (ctx.cell) {
    focusTableCell(ctx.cell);
  }

  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 12. 复制表格 (Copy Table as Markdown)
 */
export function copyTableMarkdown(vditor: any): string | null {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return null;

  const formattedMd = generateAlignedTableMarkdown(ctx.table);
  try {
    navigator.clipboard.writeText(formattedMd);
  } catch (err) {
    console.warn('Clipboard writeText failed:', err);
  }
  return formattedMd;
}

/**
 * 13. 格式化表格源码 (Format Table Source)
 */
export function formatTableSource(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  const lute = vditor.vditor?.lute || (window as any).Lute?.New();
  if (!lute) return false;

  const formattedMd = generateAlignedTableMarkdown(ctx.table);
  const newHtml = lute.SpinVditorIRDOM(formattedMd);

  const temp = document.createElement('div');
  temp.innerHTML = newHtml;
  const newTable = temp.querySelector('table');

  if (newTable && ctx.table.parentNode) {
    ctx.table.parentNode.replaceChild(newTable, ctx.table);
    focusTableCell(newTable.rows[0]?.cells[0] as HTMLElement);
    syncTableChange(vditor, onContentChange);
    return true;
  }

  return false;
}

/**
 * 14. 删除整张表格 (Delete Entire Table)
 */
export function deleteEntireTable(vditor: any, onContentChange?: (val: string) => void): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.table) return false;

  const parent = ctx.table.parentNode;
  if (!parent) return false;

  const emptyP = document.createElement('p');
  emptyP.setAttribute('data-block', '0');
  emptyP.innerHTML = '\u200B';

  parent.replaceChild(emptyP, ctx.table);
  focusTableCell(emptyP);

  syncTableChange(vditor, onContentChange);
  return true;
}

/**
 * 智能 Tab 跳格并在表格末尾自动增加新行 (流畅编辑体验)
 */
export function handleTableTab(
  vditor: any,
  shiftKey: boolean,
  onContentChange?: (val: string) => void
): boolean {
  const ctx = getTableContext(vditor);
  if (!ctx.inTable || !ctx.tr) return false;

  if (shiftKey) {
    // 向前一个单元格跳
    if (ctx.colIndex > 0) {
      focusTableCell(ctx.tr.cells[ctx.colIndex - 1] as HTMLElement);
      return true;
    }
    if (ctx.tr.previousElementSibling) {
      const prev = ctx.tr.previousElementSibling as HTMLTableRowElement;
      focusTableCell(prev.cells[prev.cells.length - 1] as HTMLElement);
      return true;
    }
    if (ctx.isHeader) return true;
    if (ctx.thead && ctx.thead.rows.length > 0) {
      const headerTr = ctx.thead.rows[0];
      focusTableCell(headerTr.cells[headerTr.cells.length - 1] as HTMLElement);
      return true;
    }
    return true;
  }

  // 向下一个单元格跳
  if (ctx.colIndex < ctx.totalCols - 1) {
    focusTableCell(ctx.tr.cells[ctx.colIndex + 1] as HTMLElement);
    return true;
  }
  if (ctx.tr.nextElementSibling) {
    const next = ctx.tr.nextElementSibling as HTMLTableRowElement;
    focusTableCell(next.cells[0] as HTMLElement);
    return true;
  }
  if (ctx.isHeader && ctx.tbody && ctx.tbody.rows.length > 0) {
    focusTableCell(ctx.tbody.rows[0].cells[0] as HTMLElement);
    return true;
  }

  // 到达整表最后 1 个单元格：按 Tab 智能追加新行并聚焦！
  return insertRowBelow(vditor, onContentChange);
}

/**
 * 生成严格垂直对齐的美化 Markdown 表格字符串
 */
export function generateAlignedTableMarkdown(table: HTMLTableElement): string {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.cells.length));
  const rawMatrix: string[][] = [];
  const aligns: Array<'left' | 'center' | 'right'> = [];

  // 获取每列对齐方式
  for (let c = 0; c < colCount; c++) {
    const alignAttr = (table.rows[0]?.cells[c]?.getAttribute('align') || 'left').toLowerCase();
    if (alignAttr === 'center') aligns.push('center');
    else if (alignAttr === 'right') aligns.push('right');
    else aligns.push('left');
  }

  // 提取各单元格纯文本内容
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rowCells: string[] = [];
    for (let c = 0; c < colCount; c++) {
      const cell = row.cells[c];
      const text = cell ? (cell.textContent?.replace(/\u200B/g, '').trim() || '') : '';
      rowCells.push(text);
    }
    rawMatrix.push(rowCells);
  }

  // 计算每列的最大显示字符宽度（至少为 3）
  const colWidths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxW = 3;
    for (let r = 0; r < rawMatrix.length; r++) {
      const w = getDisplayWidth(rawMatrix[r][c] || '');
      if (w > maxW) maxW = w;
    }
    colWidths.push(maxW);
  }

  const lines: string[] = [];

  // 表头
  const headers = rawMatrix[0] || [];
  const paddedHeaders = headers.map((h, c) => padDisplay(h, colWidths[c], aligns[c]));
  lines.push(`| ${paddedHeaders.join(' | ')} |`);

  // 分隔符行
  const separators = colWidths.map((w, c) => {
    const align = aligns[c];
    if (align === 'center') {
      return ':' + '-'.repeat(Math.max(1, w - 2)) + ':';
    }
    if (align === 'right') {
      return '-'.repeat(Math.max(2, w - 1)) + ':';
    }
    return ':' + '-'.repeat(Math.max(2, w - 1));
  });
  lines.push(`| ${separators.join(' | ')} |`);

  // 数据行
  for (let r = 1; r < rawMatrix.length; r++) {
    const row = rawMatrix[r];
    const paddedRow = row.map((cellText, c) => padDisplay(cellText, colWidths[c], aligns[c]));
    lines.push(`| ${paddedRow.join(' | ')} |`);
  }

  return lines.join('\n');
}
