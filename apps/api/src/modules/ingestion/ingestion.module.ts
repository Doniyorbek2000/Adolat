import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor } from './ingestion.processor';
import { ChunkerService } from './services/chunker.service';
import { EmbeddingService } from './services/embedding.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ingestion',
    }),
  ],
  providers: [IngestionService, IngestionProcessor, ChunkerService, EmbeddingService],
  exports: [IngestionService, ChunkerService, EmbeddingService],
})
export class IngestionModule {}
