import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegalSourceStatus, LegalSourceType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmbeddingService } from '../../ingestion/services/embedding.service';
import { RagChunk } from '../rag.service';

const TOP_K = 8;

/** pgvector cosine qidiruvi qaytaradigan xom qator. */
interface RetrievedRow {
  content: string;
  articleRef: string | null;
  documentTitle: string;
  documentUrl: string;
  publishedAt: Date | null;
  sourceName: string;
  similarity: number;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly similarityThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
    private readonly config: ConfigService,
  ) {
    this.similarityThreshold = this.config.get<number>('RAG_MIN_SIMILARITY', 0.70);
    this.logger.log(`RAG similarity threshold: ${this.similarityThreshold}`);
  }

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

  /**
   * pgvector cosine qidiruvi: ANN indeks (`<=>`) yordamida eng yaqin top-K
   * chunk'ni to'g'ridan-to'g'ri PostgreSQL'da tanlaydi. Barcha embedding'larni
   * xotiraga yuklamaydi — katta hajmda ham tez ishlaydi.
   *
   * similarity = 1 - cosine_distance.
   */
  private async retrieveByEmbedding(
    queryEmbedding: number[],
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const typeFilter =
      sourceTypes && sourceTypes.length > 0
        ? Prisma.sql`AND s."type"::text = ANY(${sourceTypes.map((t) => String(t))})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RetrievedRow[]>`
      SELECT
        c."content"                                        AS "content",
        c."article_ref"                                    AS "articleRef",
        v."document_title"                                 AS "documentTitle",
        v."document_url"                                   AS "documentUrl",
        v."published_at"                                   AS "publishedAt",
        s."name"                                           AS "sourceName",
        1 - (c."embedding" <=> ${vectorLiteral}::vector)   AS "similarity"
      FROM "legal_source_chunks" c
      JOIN "legal_source_versions" v ON v."id" = c."version_id"
      JOIN "legal_sources" s ON s."id" = v."source_id"
      WHERE c."embedding" IS NOT NULL
        AND s."status" = ${LegalSourceStatus.ACTIVE}::"LegalSourceStatus"
        ${typeFilter}
      ORDER BY c."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${TOP_K}
    `;

    return rows
      .map((r) => ({ ...r, similarity: Number(r.similarity) }))
      .filter((r) => r.similarity >= this.similarityThreshold)
      .map((r) => ({
        content: r.content,
        sourceName: r.sourceName,
        documentTitle: r.documentTitle,
        documentUrl: r.documentUrl,
        articleRef: r.articleRef ?? undefined,
        publishedAt: r.publishedAt ?? undefined,
        similarity: r.similarity,
      }));
  }

  private async retrieveByFullText(
    queryText: string,
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    // Extract meaningful terms (>3 chars, max 6 terms)
    const terms = queryText
      .split(/\s+/)
      .map((t) => t.replace(/[^\wЀ-ӿЀ-ԯ]/g, ''))
      .filter((t) => t.length > 3)
      .slice(0, 6);

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
      take: TOP_K * 4, // Fetch more, then re-rank by term-hit count
    });

    // Score by how many query terms appear in the chunk content
    const lowerQuery = queryText.toLowerCase();
    const scored = chunks
      .map((chunk) => {
        const lower = chunk.content.toLowerCase();
        const hitCount = terms.filter((t) => lower.includes(t.toLowerCase())).length;
        // Bonus if the chunk content includes the full query phrase
        const phraseBonus = lower.includes(lowerQuery.slice(0, 40).toLowerCase()) ? 1 : 0;
        return { chunk, score: hitCount + phraseBonus };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    return scored.map(({ chunk, score }) => ({
      content: chunk.content,
      sourceName: chunk.version.source.name,
      documentTitle: chunk.version.documentTitle,
      documentUrl: chunk.version.documentUrl,
      articleRef: chunk.articleRef ?? undefined,
      publishedAt: chunk.version.publishedAt ?? undefined,
      // Normalised placeholder: max possible = terms.length + 1 (phrase bonus)
      similarity: Math.min(score / (terms.length + 1), 0.65),
    }));
  }
}
