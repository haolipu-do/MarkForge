/**
 * @file src/utils/markdownStats.ts
 * @description 计算 Markdown 文本的中英文字数、字符数、预估阅读时长并解析 H1-H6 标题大纲列表
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

/** Computes word/char counts, estimated read time, and H1-H6 heading outline from markdown text. */
export function analyzeMarkdownContent(text: string): {
  stats: MarkdownStats;
  headings: MarkdownHeading[];
} {
  const chars = text.length;
  const cnMatches = text.match(/[\u4e00-\u9fa5]/g) || [];
  const enMatches = text.match(/[a-zA-Z0-9_-]+/g) || [];
  const words = cnMatches.length + enMatches.length;
  const readTime = Math.ceil(words / 300) || 1;

  const headings: MarkdownHeading[] = [];
  text.split('\n').forEach((line, idx) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const headingText = match[2].trim();
      headings.push({
        level,
        text: headingText,
        id: `heading-${idx}-${headingText.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`,
      });
    }
  });

  return {
    stats: { words, chars, readTime },
    headings,
  };
}
