import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LegalSourceStatus, Prisma, SyncJobStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { CreateLegalSourceDto } from './dto/create-legal-source.dto';
import { UpdateLegalSourceDto } from './dto/update-legal-source.dto';

@Injectable()
export class LegalSourcesService {
  private readonly logger = new Logger(LegalSourcesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
  ) {}

  async findAll() {
    const sources = await this.prisma.legalSource.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      sources.map(async (source) => ({
        ...source,
        chunkCount: await this.getChunkCount(source.id),
      })),
    );
  }

  async findOne(id: string) {
    const source = await this.prisma.legalSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Legal source with id "${id}" not found`);
    }
    return source;
  }

  async create(dto: CreateLegalSourceDto, adminId?: string) {
    return this.prisma.legalSource.create({
      data: {
        name: dto.name,
        type: dto.type,
        baseUrl: dto.baseUrl,
        description: dto.description,
        syncIntervalHours: dto.syncIntervalHours ?? 24,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        status: LegalSourceStatus.ACTIVE,
      },
    });
  }

  async update(id: string, dto: UpdateLegalSourceDto) {
    await this.findOne(id);
    return this.prisma.legalSource.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.baseUrl !== undefined && { baseUrl: dto.baseUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.syncIntervalHours !== undefined && { syncIntervalHours: dto.syncIntervalHours }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async disable(id: string) {
    await this.findOne(id);
    return this.prisma.legalSource.update({
      where: { id },
      data: { status: LegalSourceStatus.DISABLED },
    });
  }

  async getChunkCount(sourceId: string): Promise<number> {
    return this.prisma.legalSourceChunk.count({
      where: {
        version: {
          sourceId,
        },
      },
    });
  }

  async getSyncJobs(sourceId: string, limit = 10) {
    return this.prisma.sourceSyncJob.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async triggerSync(sourceId: string, adminId?: string) {
    await this.findOne(sourceId);
    const job = await this.prisma.sourceSyncJob.create({
      data: {
        sourceId,
        status: SyncJobStatus.PENDING,
        triggeredByAdminId: adminId ?? null,
      },
    });

    // Sinxronni fon rejimida ishga tushiramiz (HTTP javobni bloklamaydi).
    void this.ingestion.syncSource(job.id, sourceId).catch((err) => {
      this.logger.error(`Qo'lda sinxron ${job.id} muvaffaqiyatsiz: ${String(err)}`);
    });

    return job;
  }
}
