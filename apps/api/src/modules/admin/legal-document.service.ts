import * as crypto from 'crypto';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LegalSourceStatus, LegalSourceType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { ChunkerService } from '../ingestion/services/chunker.service';
import { EmbeddingService } from '../ingestion/services/embedding.service';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

export type IndexingStatus = 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED';

export interface LegalDocumentRecord {
  id: string;
  title: string;
  category: string | null;
  sourceUrl: string | null;
  sourceType: LegalSourceType;
  indexingStatus: IndexingStatus;
  chunksCount: number;
  errorMessage: string | null;
  createdBy: string | null;
  indexedAt: string | null;
  createdAt: Date;
}

/** JSON stored in LegalSourceVersion.metadata for manual documents */
interface ManualDocMeta {
  isManual: true;
  indexingStatus: IndexingStatus;
  category?: string;
  rawContent: string;
  createdBy?: string;
  chunksCount?: number;
  errorMessage?: string;
  indexedAt?: string;
}

const MANUAL_SOURCE_BASE_URL = 'manual://admin-documents';
const MANUAL_SOURCE_NAME = 'Manual Documents (Admin)';

@Injectable()
export class LegalDocumentService {
  private readonly logger = new Logger(LegalDocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: ChunkerService,
    private readonly embedding: EmbeddingService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async create(dto: CreateLegalDocumentDto, adminId: string): Promise<{ id: string; status: IndexingStatus }> {
    const source = await this.getOrCreateManualSource(dto.sourceType);

    const contentHash = crypto.createHash('sha256').update(dto.content).digest('hex');

    const meta: ManualDocMeta = {
      isManual: true,
      indexingStatus: 'PENDING',
      category: dto.category,
      rawContent: dto.content,
      createdBy: adminId,
    };

    const version = await this.prisma.legalSourceVersion.create({
      data: {
        sourceId: source.id,
        documentTitle: dto.title,
        documentUrl: dto.sourceUrl ?? `manual://${contentHash.slice(0, 16)}`,
        contentHash,
        metadata: meta as unknown as Prisma.InputJsonValue,
      },
    });

    // Async indexing — do not await, track status in metadata
    setImmediate(() => {
      this.indexVersion(version.id, dto.content).catch((err) => {
        this.logger.error(`Background indexing failed for ${version.id}: ${String(err)}`);
      });
    });

    return { id: version.id, status: 'PENDING' };
  }

  async findAll(): Promise<LegalDocumentRecord[]> {
    const versions = await this.prisma.legalSourceVersion.findMany({
      where: {
        metadata: {
          path: ['isManual'],
          equals: true,
        },
      },
      include: { source: true },
      orderBy: { fetchedAt: 'desc' },
    });

    return versions.map((v) => {
      const meta = (v.metadata ?? {}) as Partial<ManualDocMeta>;
      return {
        id: v.id,
        title: v.documentTitle,
        category: meta.category ?? null,
        sourceUrl: v.documentUrl.startsWith('manual://') ? null : v.documentUrl,
        sourceType: v.source.type,
        indexingStatus: meta.indexingStatus ?? 'PENDING',
        chunksCount: meta.chunksCount ?? 0,
        errorMessage: meta.errorMessage ?? null,
        createdBy: meta.createdBy ?? null,
        indexedAt: meta.indexedAt ?? null,
        createdAt: v.fetchedAt,
      };
    });
  }

  async retryIndexing(versionId: string): Promise<{ status: IndexingStatus }> {
    const version = await this.prisma.legalSourceVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException(`Document ${versionId} topilmadi`);

    const meta = (version.metadata ?? {}) as Partial<ManualDocMeta>;
    if (!meta.isManual) {
      throw new NotFoundException('Bu hujjat manual emas — retry qo\'llanilmaydi');
    }
    if (!meta.rawContent) {
      throw new NotFoundException('Hujjat matni saqlanmagan — retry mumkin emas');
    }

    // Delete existing chunks before retry
    await this.prisma.legalSourceChunk.deleteMany({ where: { versionId } });

    // Reset status
    await this.updateMeta(versionId, { indexingStatus: 'PENDING', errorMessage: undefined, chunksCount: undefined });

    // Fire async re-indexing
    setImmediate(() => {
      this.indexVersion(versionId, meta.rawContent!).catch((err) => {
        this.logger.error(`Retry indexing failed for ${versionId}: ${String(err)}`);
      });
    });

    return { status: 'PENDING' };
  }

  async deleteDocument(versionId: string): Promise<void> {
    const version = await this.prisma.legalSourceVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException(`Document ${versionId} topilmadi`);

    // Cascade delete: chunks are deleted by FK onDelete:Cascade
    await this.prisma.legalSourceVersion.delete({ where: { id: versionId } });
    this.logger.log(`Manual document ${versionId} o'chirildi`);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private async indexVersion(versionId: string, content: string): Promise<void> {
    try {
      await this.updateMeta(versionId, { indexingStatus: 'INDEXING' });
      this.logger.log(`Indexing started for version ${versionId}`);

      // 1. Chunk the content
      const chunks = this.chunker.chunk(content);
      if (chunks.length === 0) {
        await this.updateMeta(versionId, {
          indexingStatus: 'FAILED',
          errorMessage: 'Matndan hech qanday chunk yaratilmadi',
        });
        return;
      }

      // 2. Embed all chunks in one batch call
      const texts = chunks.map((c) => c.content);
      const embeddings = await this.embedding.embedBatch(texts);
      const hasEmbeddings = embeddings.length === chunks.length && embeddings[0]?.length > 0;

      if (!hasEmbeddings) {
        this.logger.warn(`Embeddings unavailable for ${versionId} — storing chunks without vectors (ILIKE fallback will be used)`);
      }

      // 3. Persist chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingVector = hasEmbeddings ? (embeddings[i] ?? []) : [];
        const articleRef = this.extractArticleRef(chunk.content);

        const created = await this.prisma.legalSourceChunk.create({
          data: {
            versionId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            articleRef: articleRef ?? null,
          },
        });

        // Embedding'ni pgvector ustuniga xom SQL orqali yozamiz.
        if (embeddingVector.length > 0) {
          const vectorLiteral = `[${embeddingVector.join(',')}]`;
          await this.prisma.$executeRaw`
            UPDATE "legal_source_chunks"
            SET "embedding" = ${vectorLiteral}::vector
            WHERE "id" = ${created.id}::uuid
          `;
        }
      }

      await this.updateMeta(versionId, {
        indexingStatus: 'INDEXED',
        chunksCount: chunks.length,
        indexedAt: new Date().toISOString(),
        errorMessage: undefined,
      });

      this.logger.log(`Indexing completed for ${versionId}: ${chunks.length} chunks, embeddings=${hasEmbeddings}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Indexing failed for ${versionId}: ${msg}`);
      await this.updateMeta(versionId, {
        indexingStatus: 'FAILED',
        errorMessage: msg,
      });
    }
  }

  private extractArticleRef(text: string): string | null {
    const firstLine = text.split('\n')[0].trim();
    const match = firstLine.match(/^(\d+-?(?:modd|chi|nchi|unchi)a|Modda\s+\d+|Статья\s+\d+)/i);
    return match ? match[0] : null;
  }

  private async updateMeta(
    versionId: string,
    patch: Partial<Omit<ManualDocMeta, 'isManual' | 'rawContent' | 'category' | 'createdBy'>>,
  ): Promise<void> {
    const current = await this.prisma.legalSourceVersion.findUnique({
      where: { id: versionId },
      select: { metadata: true },
    });
    const existing = (current?.metadata ?? {}) as Partial<ManualDocMeta>;
    const updated: ManualDocMeta = {
      ...(existing as ManualDocMeta),
      ...patch,
    } as ManualDocMeta;

    // Remove undefined keys so they don't overwrite existing values
    const rec = updated as unknown as Record<string, unknown>;
    for (const key of Object.keys(rec)) {
      if (rec[key] === undefined) {
        delete rec[key];
      }
    }

    await this.prisma.legalSourceVersion.update({
      where: { id: versionId },
      data: { metadata: updated as unknown as Prisma.InputJsonValue },
    });
  }

  private async getOrCreateManualSource(
    type: LegalSourceType = LegalSourceType.OTHER_OFFICIAL,
  ) {
    const existing = await this.prisma.legalSource.findFirst({
      where: { baseUrl: MANUAL_SOURCE_BASE_URL },
    });
    if (existing) return existing;

    return this.prisma.legalSource.create({
      data: {
        name: MANUAL_SOURCE_NAME,
        type,
        baseUrl: MANUAL_SOURCE_BASE_URL,
        description: 'Admin tomonidan qo\'lda kiritilgan qonun hujjatlari',
        status: LegalSourceStatus.ACTIVE,
        syncIntervalHours: 0,
      },
    });
  }
}
