import { Injectable } from '@nestjs/common';
import { RagChunk } from '../rag.service';

@Injectable()
export class ContextBuilderService {
  /**
   * Format a list of RAG chunks into a system-prompt-ready context string.
   */
  build(chunks: RagChunk[], language: 'UZ' | 'RU'): string {
    if (chunks.length === 0) return '';

    const header =
      language === 'UZ'
        ? 'Quyidagi huquqiy manba parchalaridan foydalaning:'
        : 'Используйте следующие фрагменты правовых источников:';

    const body = chunks
      .map((chunk, idx) => {
        const citation = this.buildCitation(chunk, language);
        return `[${idx + 1}] ${citation}\n${chunk.content.trim()}`;
      })
      .join('\n\n---\n\n');

    return `${header}\n\n${body}`;
  }

  private buildCitation(chunk: RagChunk, language: 'UZ' | 'RU'): string {
    const parts: string[] = [];

    if (language === 'UZ') {
      parts.push(`Manba: ${chunk.sourceName}`);
      parts.push(`Hujjat: ${chunk.documentTitle}`);
      if (chunk.articleRef) parts.push(`Modda: ${chunk.articleRef}`);
      if (chunk.publishedAt) {
        parts.push(`Sana: ${chunk.publishedAt.toISOString().split('T')[0]}`);
      }
      parts.push(`URL: ${chunk.documentUrl}`);
    } else {
      parts.push(`Источник: ${chunk.sourceName}`);
      parts.push(`Документ: ${chunk.documentTitle}`);
      if (chunk.articleRef) parts.push(`Статья: ${chunk.articleRef}`);
      if (chunk.publishedAt) {
        parts.push(`Дата: ${chunk.publishedAt.toISOString().split('T')[0]}`);
      }
      parts.push(`URL: ${chunk.documentUrl}`);
    }

    return parts.join(' | ');
  }
}
