import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { RagService } from './rag.service';
import { RetrievalService } from './services/retrieval.service';
import { SourceRouterService } from './services/source-router.service';
import { ContextBuilderService } from './services/context-builder.service';

@Module({
  imports: [PrismaModule, AiRouterModule, IngestionModule],
  providers: [RagService, RetrievalService, SourceRouterService, ContextBuilderService],
  exports: [RagService, RetrievalService, SourceRouterService, ContextBuilderService],
})
export class RagModule {}
