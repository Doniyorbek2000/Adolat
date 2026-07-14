import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LegalSourceStatus, SyncJobStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { IngestionService } from './ingestion.service';

/**
 * Rasmiy huquqiy manbalarni AVTOMATIK sinxronlaydi (master-spec: lex.uz
 * avto-sinxron + qonun o'zgarganda RAG indeksini yangilash).
 *
 * Har soatda ishga tushadi va har bir ACTIVE manbani `syncIntervalHours`
 * bo'yicha muddati kelganida qayta yuklab, chunk'lash + embedding orqali
 * pgvector indeksini yangilaydi. Qo'lda yaratilgan PENDING joblar ham
 * shu yerda ishga tushiriladi.
 *
 * `INGESTION_AUTO_SYNC=true` bo'lmasa ishlamaydi (dev'da ehtiyot uchun o'chiq).
 */
@Injectable()
export class SourceSyncSchedulerService {
  private readonly logger = new Logger(SourceSyncSchedulerService.name);
  private readonly autoSync: boolean;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestion: IngestionService,
    private readonly config: ConfigService,
  ) {
    this.autoSync = this.config.get<boolean>('INGESTION_AUTO_SYNC', false);
    this.logger.log(`Avto-sinxron: ${this.autoSync ? 'yoqilgan' : "o'chirilgan"}`);
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'legal-source-auto-sync' })
  async handleCron(): Promise<void> {
    await this.syncDueSources();
  }

  /**
   * Muddati kelgan barcha manbalarni sinxronlaydi. Sinov va qo'lda ishga
   * tushirish uchun ochiq. Sinxronlangan manbalar sonini qaytaradi.
   */
  async syncDueSources(): Promise<number> {
    if (!this.autoSync) return 0;
    if (this.running) {
      this.logger.warn('Oldingi sinxron hali tugamagan — o\'tkazib yuborildi');
      return 0;
    }

    this.running = true;
    let synced = 0;
    try {
      const sources = await this.prisma.legalSource.findMany({
        where: { status: LegalSourceStatus.ACTIVE },
      });

      const now = Date.now();
      const due = sources.filter((s) => this.isDue(s.lastSyncedAt, s.syncIntervalHours, now));

      if (due.length === 0) {
        this.logger.debug('Sinxronlash uchun muddati kelgan manba yo\'q');
        return 0;
      }

      this.logger.log(`${due.length} ta manba sinxronlanadi`);

      // Tashqi saytlarga bosim bermaslik uchun ketma-ket ishlaymiz
      for (const source of due) {
        try {
          const job = await this.prisma.sourceSyncJob.create({
            data: { sourceId: source.id, status: SyncJobStatus.PENDING },
          });
          await this.ingestion.syncSource(job.id, source.id);
          synced += 1;
        } catch (err) {
          this.logger.error(`Manba ${source.id} sinxroni muvaffaqiyatsiz: ${String(err)}`);
        }
      }

      this.logger.log(`Avto-sinxron tugadi: ${synced}/${due.length} manba`);
      return synced;
    } finally {
      this.running = false;
    }
  }

  private isDue(lastSyncedAt: Date | null, intervalHours: number, now: number): boolean {
    if (!lastSyncedAt) return true;
    return now - lastSyncedAt.getTime() >= intervalHours * 3_600_000;
  }
}
