import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { IngestionService } from './ingestion.service';

export interface SyncSourceJobPayload {
  syncJobId: string;
  sourceId: string;
}

@Processor('ingestion')
export class IngestionProcessor {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestionService: IngestionService) {}

  @Process('sync-source')
  async handleSyncSource(job: Job<SyncSourceJobPayload>): Promise<void> {
    const { syncJobId, sourceId } = job.data;
    this.logger.log(
      `Processing sync-source job ${job.id}: syncJobId=${syncJobId}, sourceId=${sourceId}`,
    );

    try {
      await this.ingestionService.syncSource(syncJobId, sourceId);
      this.logger.log(`sync-source job ${job.id} completed successfully`);
    } catch (err) {
      this.logger.error(`sync-source job ${job.id} failed: ${String(err)}`);
      throw err; // Re-throw so Bull marks the job as failed
    }
  }
}
