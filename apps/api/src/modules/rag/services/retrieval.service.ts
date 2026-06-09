import { Injectable, Logger } from '@nestjs/common';
import { LegalSourceStatus, LegalSourceType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmbeddingService } from '../../ingestion/services/embedding.service';
import { RagChunk } from '../rag.service';

const SIMILARITY_THRESHOLD = 0.3;
const TOP_K = 8;

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  /**
   * Retrieve the most relevant chunks for a query.
   * Uses cosine similarity on stored embeddings when available,
   * falls back to PostgreSQL ILIKE full-text search when embeddings are absent.
   */
  async retrieve(
    queryText: string,
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    const queryEmbedding = await this.embedding.embed(queryText);
    const useEmbeddings = queryEmbedding.length > 0;

    if (useEmbeddings) {
      return this.retrieveByEmbedding(queryEmbedding, sourceTypes);
    } else {
      this.logger.warn('No embedding available — falling back to full-text search');
      return this.retrieveByFullText(queryText, sourceTypes);
    }
  }

  private async retrieveByEmbedding(
    queryEmbedding: number[],
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    // Fetch chunks from enabled sources (optionally filtered by type)
    const chunks = await this.prisma.legalSourceChunk.findMany({
      where: {
        version: {
          source: {
            status: LegalSourceStatus.ACTIVE,
            ...(sourceTypes && sourceTypes.length > 0
              ? { type: { in: sourceTypes } }
              : {}),
          },
        },
        embeddingRef: { not: null },
      },
      include: {
        version: {
          include: { source: true },
        },
      },
    });

    // Compute cosine similarity for each chunk
    const scored: Array<{ chunk: typeof chunks[0]; similarity: number }> = [];

    for (const chunk of chunks) {
      if (!chunk.embeddingRef) continue;

      let chunkEmbedding: number[];
      try {
        chunkEmbedding = JSON.parse(chunk.embeddingRef) as number[];
      } catch {
        continue;
      }

      const similarity = this.embedding.cosineSimilarity(queryEmbedding, chunkEmbedding);
      if (similarity >= SIMILARITY_THRESHOLD) {
        scored.push({ chunk, similarity });
      }
    }

    // Sort descending and take top K
    scored.sort((a, b) => b.similarity - a.similarity);
    const topChunks = scored.slice(0, TOP_K);

    return topChunks.map(({ chunk, similarity }) => ({
      content: chunk.content,
      sourceName: chunk.version.source.name,
      documentTitle: chunk.version.documentTitle,
      documentUrl: chunk.version.documentUrl,
      articleRef: chunk.articleRef ?? undefined,
      publishedAt: chunk.version.publishedAt ?? undefined,
      similarity,
    }));
  }

  private async retrieveByFullText(
    queryText: string,
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    // Build search terms: split query into words and ILIKE each
    const terms = queryText
      .split(/\s+/)
      .filter((t) => t.length > 3)
      .slice(0, 5);

    if (terms.length === 0) return [];

    const chunks = await this.prisma.legalSourceChunk.findMany({
      where: {
        AND: [
          {
            version: {
              source: {
                status: LegalSourceStatus.ACTIVE,
                ...(sourceTypes && sourceTypes.length > 0
                  ? { type: { in: sourceTypes } }
                  : {}),
              },
            },
          },
          {
            OR: terms.map((term) => ({
              content: { contains: term, mode: 'insensitive' as const },
            })),
          },
        ],
      },
      include: {
        version: {
          include: { source: true },
        },
      },
      take: TOP_K,
    });

    return chunks.map((chunk) => ({
      content: chunk.content,
      sourceName: chunk.version.source.name,
      documentTitle: chunk.version.documentTitle,
      documentUrl: chunk.version.documentUrl,
      articleRef: chunk.articleRef ?? undefined,
      publishedAt: chunk.version.publishedAt ?? undefined,
      similarity: 0.5, // Placeholder score for full-text fallback
    }));
  }
}
