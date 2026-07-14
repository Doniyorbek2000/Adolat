import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegalSourceStatus, LegalSourceType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmbeddingService } from '../../ingestion/services/embedding.service';
import { RagChunk } from '../rag.service';

const TOP_K = 8;
/** Nomzodlar soni (fusion'dan oldin har bir usuldan olinadi). */
const CANDIDATES = TOP_K * 3;
/** Reciprocal Rank Fusion konstantasi (standart 60). */
const RRF_K = 60;

/** pgvector cosine qidiruvi qaytaradigan xom qator. */
interface RetrievedRow {
  id: string;
  content: string;
  articleRef: string | null;
  documentTitle: string;
  documentUrl: string;
  publishedAt: Date | null;
  sourceName: string;
  similarity: number;
}

interface Candidate {
  id: string;
  chunk: RagChunk;
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
   * Eng mos chunk'larni topadi.
   *
   * Embedding mavjud bo'lsa — **hybrid qidiruv**: pgvector (semantik) va
   * keyword (ILIKE) natijalari Reciprocal Rank Fusion (RRF) bilan birlashtiriladi.
   * Embedding bo'lmasa — faqat keyword qidiruvga qaytadi.
   */
  async retrieve(queryText: string, sourceTypes?: LegalSourceType[]): Promise<RagChunk[]> {
    const queryEmbedding = await this.embedding.embed(queryText);

    if (queryEmbedding.length > 0) {
      return this.retrieveHybrid(queryEmbedding, queryText, sourceTypes);
    }

    this.logger.warn('Embedding mavjud emas — faqat keyword qidiruv');
    const kw = await this.keywordSearch(queryText, sourceTypes, TOP_K);
    return kw.map((c) => c.chunk);
  }

  /**
   * Hybrid: vector + keyword natijalarini RRF bilan birlashtiradi.
   * RRF skori = Σ 1 / (RRF_K + rank). Sifat uchun: keyword mos kelgan yoki
   * vector o'xshashligi chegaradan yuqori chunk'lar saqlanadi.
   */
  private async retrieveHybrid(
    queryEmbedding: number[],
    queryText: string,
    sourceTypes?: LegalSourceType[],
  ): Promise<RagChunk[]> {
    const [vector, keyword] = await Promise.all([
      this.vectorSearch(queryEmbedding, sourceTypes, CANDIDATES),
      this.keywordSearch(queryText, sourceTypes, CANDIDATES),
    ]);

    const fused = new Map<string, number>();
    const byId = new Map<string, RagChunk>();
    const vectorSim = new Map<string, number>();
    const keywordIds = new Set<string>();

    vector.forEach((c, rank) => {
      fused.set(c.id, (fused.get(c.id) ?? 0) + 1 / (RRF_K + rank));
      byId.set(c.id, c.chunk);
      vectorSim.set(c.id, c.chunk.similarity);
    });

    keyword.forEach((c, rank) => {
      fused.set(c.id, (fused.get(c.id) ?? 0) + 1 / (RRF_K + rank));
      if (!byId.has(c.id)) byId.set(c.id, c.chunk);
      keywordIds.add(c.id);
    });

    return [...fused.entries()]
      .filter(([id]) => keywordIds.has(id) || (vectorSim.get(id) ?? 0) >= this.similarityThreshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_K)
      .map(([id]) => byId.get(id))
      .filter((c): c is RagChunk => Boolean(c));
  }

  /** pgvector ANN qidiruvi (`<=>` cosine masofa). */
  private async vectorSearch(
    queryEmbedding: number[],
    sourceTypes: LegalSourceType[] | undefined,
    limit: number,
  ): Promise<Candidate[]> {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const typeFilter =
      sourceTypes && sourceTypes.length > 0
        ? Prisma.sql`AND s."type"::text = ANY(${sourceTypes.map((t) => String(t))})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RetrievedRow[]>`
      SELECT
        c."id"                                             AS "id",
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
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      chunk: {
        content: r.content,
        sourceName: r.sourceName,
        documentTitle: r.documentTitle,
        documentUrl: r.documentUrl,
        articleRef: r.articleRef ?? undefined,
        publishedAt: r.publishedAt ?? undefined,
        similarity: Number(r.similarity),
      },
    }));
  }

  /** Keyword (ILIKE) qidiruvi — so'zlar bo'yicha mos kelgan chunk'lar. */
  private async keywordSearch(
    queryText: string,
    sourceTypes: LegalSourceType[] | undefined,
    limit: number,
  ): Promise<Candidate[]> {
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
                ...(sourceTypes && sourceTypes.length > 0 ? { type: { in: sourceTypes } } : {}),
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
      include: { version: { include: { source: true } } },
      take: limit * 2,
    });

    const lowerQuery = queryText.toLowerCase();
    return chunks
      .map((chunk) => {
        const lower = chunk.content.toLowerCase();
        const hitCount = terms.filter((t) => lower.includes(t.toLowerCase())).length;
        const phraseBonus = lower.includes(lowerQuery.slice(0, 40)) ? 1 : 0;
        return { chunk, score: hitCount + phraseBonus };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ chunk, score }) => ({
        id: chunk.id,
        chunk: {
          content: chunk.content,
          sourceName: chunk.version.source.name,
          documentTitle: chunk.version.documentTitle,
          documentUrl: chunk.version.documentUrl,
          articleRef: chunk.articleRef ?? undefined,
          publishedAt: chunk.version.publishedAt ?? undefined,
          similarity: Math.min(score / (terms.length + 1), 0.65),
        },
      }));
  }
}
