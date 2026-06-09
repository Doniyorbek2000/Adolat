import { Injectable } from '@nestjs/common';

export interface ChunkResult {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

/** Approximate chars per token (1 token ≈ 4 chars) */
const CHARS_PER_TOKEN = 4;

/** Regex patterns that mark article/section boundaries in Uzbek and Russian legal texts */
const ARTICLE_BOUNDARY_RE =
  /(?:^|\n)(?:\d+-?(?:modd|chi|nchi|unchi|nchi)a|Modda\s+\d+|(?:X{0,3}(?:IX|IV|V?I{0,3})|\d+)-(?:modda|bob)|Статья\s+\d+|Глава\s+\d+)/im;

@Injectable()
export class ChunkerService {
  /**
   * Split `text` into chunks of at most `maxTokens` tokens with `overlapTokens` overlap.
   *
   * Strategy:
   * 1. Split by article/section boundaries (Uzbek & Russian legal patterns).
   * 2. If a segment is still too large, split by paragraph breaks (\n\n).
   * 3. If still too large, split by character count.
   */
  chunk(text: string, maxTokens = 900, overlapTokens = 100): ChunkResult[] {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    const overlapChars = overlapTokens * CHARS_PER_TOKEN;

    // Step 1: split by article boundaries
    const segments = this.splitByArticles(text);

    // Step 2 & 3: break large segments further
    const rawChunks: Array<{ content: string; startChar: number }> = [];
    for (const seg of segments) {
      if (seg.content.length <= maxChars) {
        rawChunks.push(seg);
      } else {
        const sub = this.splitByParagraphs(seg.content, seg.startChar, maxChars);
        rawChunks.push(...sub);
      }
    }

    // Apply overlap: for each chunk (except first), prepend the tail of the previous chunk
    const results: ChunkResult[] = [];
    for (let i = 0; i < rawChunks.length; i++) {
      let content = rawChunks[i].content.trim();
      if (i > 0 && overlapChars > 0) {
        const prev = rawChunks[i - 1].content;
        const tail = prev.slice(Math.max(0, prev.length - overlapChars));
        content = tail.trim() + '\n' + content;
      }
      if (content.length === 0) continue;
      results.push({
        content,
        chunkIndex: results.length,
        startChar: rawChunks[i].startChar,
        endChar: rawChunks[i].startChar + rawChunks[i].content.length,
      });
    }

    return results;
  }

  private splitByArticles(text: string): Array<{ content: string; startChar: number }> {
    const segments: Array<{ content: string; startChar: number }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Find all article boundaries
    const re = new RegExp(ARTICLE_BOUNDARY_RE.source, 'gim');
    const positions: number[] = [];

    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        positions.push(match.index);
      }
    }

    if (positions.length === 0) {
      return [{ content: text, startChar: 0 }];
    }

    // First segment before the first boundary
    if (positions[0] > 0) {
      segments.push({ content: text.slice(0, positions[0]), startChar: 0 });
    }

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i];
      const end = i + 1 < positions.length ? positions[i + 1] : text.length;
      segments.push({ content: text.slice(start, end), startChar: start });
    }

    return segments.filter((s) => s.content.trim().length > 0);
  }

  private splitByParagraphs(
    text: string,
    baseOffset: number,
    maxChars: number,
  ): Array<{ content: string; startChar: number }> {
    const paragraphs = text.split(/\n{2,}/);
    const results: Array<{ content: string; startChar: number }> = [];
    let current = '';
    let currentStart = baseOffset;
    let offset = 0;

    for (const para of paragraphs) {
      const paraLen = para.length + 2; // +2 for the \n\n separator

      if (current.length + para.length > maxChars && current.length > 0) {
        results.push({ content: current, startChar: currentStart });
        currentStart = baseOffset + offset;
        current = para;
      } else {
        current = current.length > 0 ? current + '\n\n' + para : para;
      }
      offset += paraLen;
    }

    if (current.length > 0) {
      // Further split by char if still too big
      if (current.length > maxChars) {
        const charChunks = this.splitByChars(current, currentStart, maxChars);
        results.push(...charChunks);
      } else {
        results.push({ content: current, startChar: currentStart });
      }
    }

    return results;
  }

  private splitByChars(
    text: string,
    baseOffset: number,
    maxChars: number,
  ): Array<{ content: string; startChar: number }> {
    const results: Array<{ content: string; startChar: number }> = [];
    let i = 0;

    while (i < text.length) {
      const slice = text.slice(i, i + maxChars);
      // Try to break at sentence boundary
      const lastSentence = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
      );
      const breakAt = lastSentence > maxChars * 0.5 ? lastSentence + 2 : slice.length;
      results.push({ content: text.slice(i, i + breakAt), startChar: baseOffset + i });
      i += breakAt;
    }

    return results;
  }
}
