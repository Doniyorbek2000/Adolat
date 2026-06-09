import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LegalSourceType, Prisma, SyncJobStatus } from '@prisma/client';
import * as crypto from 'crypto';

import { PrismaService } from '../../database/prisma/prisma.service';
import { FetchedDocument } from '../legal-sources/connectors/base.connector';
import { LexUzConnector } from '../legal-sources/connectors/lexuz.connector';
import { SoliqUzConnector } from '../legal-sources/connectors/soliquz.connector';
import { MyGovConnector } from '../legal-sources/connectors/mygov.connector';
import { PresidentConnector } from '../legal-sources/connectors/president.connector';
import { GovUzConnector } from '../legal-sources/connectors/govuz.connector';
import { AdliyaUzConnector } from '../legal-sources/connectors/adliyauz.connector';
import { CentralBankConnector } from '../legal-sources/connectors/centralbank.connector';
import { CadastreConnector } from '../legal-sources/connectors/cadastre.connector';
import { CustomsConnector } from '../legal-sources/connectors/customs.connector';
import { ChunkerService } from './services/chunker.service';
import { EmbeddingService } from './services/embedding.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: ChunkerService,
    private readonly embedding: EmbeddingService,
  ) {}

  /**
   * Ingest a single FetchedDocument into the DB.
   * - Deduplicates by content hash.
   * - Creates LegalSourceVersion + LegalSourceChunks with embeddings.
   */
  async ingestDocument(
    sourceId: string,
    doc: FetchedDocument,
  ): Promise<{ versionId: string; chunksCreated: number }> {
    const contentHash = crypto
      .createHash('sha256')
      .update(doc.content)
      .digest('hex');

    // Skip if we already have this exact content
    const existing = await this.prisma.legalSourceVersion.findFirst({
      where: { sourceId, documentUrl: doc.url, contentHash },
    });
    if (existing) {
      this.logger.debug(`Skipping duplicate document: ${doc.url}`);
      return { versionId: existing.id, chunksCreated: 0 };
    }

    // Create version record
    const version = await this.prisma.legalSourceVersion.create({
      data: {
        sourceId,
        documentTitle: doc.title,
        documentUrl: doc.url,
        publishedAt: doc.publishedAt ?? null,
        contentHash,
        metadata: (doc.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Chunk the content
    const chunks = this.chunker.chunk(doc.content);
    if (chunks.length === 0) {
      return { versionId: version.id, chunksCreated: 0 };
    }

    // Embed all chunks in batch
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embedding.embedBatch(texts);

    // Persist each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingVector = embeddings[i] ?? [];

      // Extract articleRef from the first line of the chunk if it looks like an article marker
      const firstLine = chunk.content.split('\n')[0].trim();
      const articleRef =
        doc.articleRef ??
        (/^(?:Modda\s+\d+|\d+-?modda|Статья\s+\d+)/i.test(firstLine) ? firstLine : null);

      await this.prisma.legalSourceChunk.create({
        data: {
          versionId: version.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          articleRef: articleRef ?? null,
          embeddingRef: embeddingVector.length > 0 ? JSON.stringify(embeddingVector) : null,
          metadata: {
            embedding: embeddingVector,
            articleRef: articleRef ?? null,
            startChar: chunk.startChar,
            endChar: chunk.endChar,
          } as Prisma.InputJsonValue,
        },
      });
    }

    this.logger.log(
      `Ingested "${doc.title}" → version ${version.id}, ${chunks.length} chunks`,
    );

    return { versionId: version.id, chunksCreated: chunks.length };
  }

  /**
   * Run full sync for a source: fetch documents via the appropriate connector,
   * ingest each one, update SourceSyncJob status.
   */
  async syncSource(syncJobId: string, sourceId: string): Promise<void> {
    // Mark as RUNNING
    await this.prisma.sourceSyncJob.update({
      where: { id: syncJobId },
      data: {
        status: SyncJobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    let itemsFetched = 0;

    try {
      const source = await this.prisma.legalSource.findUnique({ where: { id: sourceId } });
      if (!source) {
        throw new NotFoundException(`LegalSource "${sourceId}" not found`);
      }

      // Pick connector based on source type
      const connector = this.resolveConnector(source.type);
      const documents = await connector.fetchDocuments(50);

      for (const doc of documents) {
        try {
          const result = await this.ingestDocument(sourceId, doc);
          if (result.chunksCreated > 0) {
            itemsFetched++;
          }
        } catch (docErr) {
          this.logger.warn(`Failed to ingest "${doc.url}": ${String(docErr)}`);
        }
      }

      // Update source lastSyncedAt
      await this.prisma.legalSource.update({
        where: { id: sourceId },
        data: { lastSyncedAt: new Date() },
      });

      // Mark job as COMPLETED
      await this.prisma.sourceSyncJob.update({
        where: { id: syncJobId },
        data: {
          status: SyncJobStatus.COMPLETED,
          finishedAt: new Date(),
          itemsFetched,
        },
      });

      this.logger.log(
        `Sync completed for source ${sourceId}: ${itemsFetched} new documents ingested`,
      );
    } catch (err) {
      this.logger.error(`Sync failed for source ${sourceId}: ${String(err)}`);

      await this.prisma.sourceSyncJob.update({
        where: { id: syncJobId },
        data: {
          status: SyncJobStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });

      throw err;
    }
  }

  private resolveConnector(
    type: LegalSourceType,
  ):
    | LexUzConnector
    | SoliqUzConnector
    | MyGovConnector
    | PresidentConnector
    | GovUzConnector
    | AdliyaUzConnector
    | CentralBankConnector
    | CadastreConnector
    | CustomsConnector {
    switch (type) {
      case LegalSourceType.TAX:
        return new SoliqUzConnector();
      case LegalSourceType.GOVERNMENT_SERVICE:
        return new MyGovConnector();
      case LegalSourceType.PRESIDENT:
        return new PresidentConnector();
      case LegalSourceType.GOVERNMENT:
        return new GovUzConnector();
      case LegalSourceType.JUSTICE:
        return new AdliyaUzConnector();
      case LegalSourceType.CENTRAL_BANK:
        return new CentralBankConnector();
      case LegalSourceType.CADASTRE:
        return new CadastreConnector();
      case LegalSourceType.CUSTOMS:
        return new CustomsConnector();
      case LegalSourceType.LEGAL:
      default:
        return new LexUzConnector();
    }
  }
}
