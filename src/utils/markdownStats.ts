/**
 * @file src/utils/markdownStats.ts
 * @description 计算 Markdown 文本的中英文字数、字符数、预估阅读时长并解析 H1-H6 标题大纲列表（零大数组分配单趟扫描）
 * @module 文档统计与大纲解析
 */
export interface MarkdownStats {
  words: number;
  chars: number;
  readTime: number;
}

export interface MarkdownHeading {
  level: number;
  text: string;
  id: string;
}

/**
 * Single-pass zero-array-allocation analyzer for 300k+ char Markdown documents.
 * Avoids global `.match(/.../g)` arrays and `.split('\n')` GC spikes.
 */
export function analyzeMarkdownContent(text: string): {
  stats: MarkdownStats;
  headings: MarkdownHeading[];
} {
  const len = text.length;
  let cjkCount = 0;
  let enWordCount = 0;
  let inEnToken = false;

  const headings: MarkdownHeading[] = [];
  let lineIdx = 0;
  let lineStart = 0;
  let inCodeFence = false;

  for (let i = 0; i <= len; i++) {
    const code = i < len ? text.charCodeAt(i) : 10; // treat EOF as '\n'

    if (code === 10) {
      if (inEnToken) {
        enWordCount++;
        inEnToken = false;
      }

      // Inspect line only if non-empty and could be a code fence or heading
      if (i > lineStart) {
        // Trim leading spaces/tabs up to 3 chars
        let p = lineStart;
        while (p < i && (text.charCodeAt(p) === 32 || text.charCodeAt(p) === 9)) p++;
        const firstCh = p < i ? text.charCodeAt(p) : 0;

        if (firstCh === 96 && text.startsWith('```', p)) {
          inCodeFence = !inCodeFence;
        } else if (!inCodeFence && firstCh === 35 /* '#' */) {
          let level = 0;
          while (p + level < i && text.charCodeAt(p + level) === 35 && level <= 6) {
            level++;
          }
          if (level >= 1 && level <= 6 && p + level < i && (text.charCodeAt(p + level) === 32 || text.charCodeAt(p + level) === 9)) {
            const headingText = text.slice(p + level + 1, i).trim();
            if (headingText) {
              headings.push({
                level,
                text: headingText,
                id: `heading-${lineIdx}-${headingText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`,
              });
            }
          }
        }
      }

      lineIdx++;
      lineStart = i + 1;
      continue;
    }

    if (code >= 0x4e00 && code <= 0x9fa5) {
      cjkCount++;
      if (inEnToken) {
        enWordCount++;
        inEnToken = false;
      }
    } else if (
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 95 ||
      code === 45
    ) {
      inEnToken = true;
    } else if (inEnToken) {
      enWordCount++;
      inEnToken = false;
    }
  }

  const words = cjkCount + enWordCount;
  const readTime = Math.ceil(words / 300) || 1;

  return {
    stats: { words, chars: len, readTime },
    headings,
  };
}
