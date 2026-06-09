import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';
import { FilesModule } from '../files/files.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

import { DocumentAnalyzerService } from './document-analyzer.service';
import { DocumentAnalyzerController } from './document-analyzer.controller';

@Module({
  imports: [PrismaModule, AiRouterModule, FilesModule, SubscriptionsModule],
  controllers: [DocumentAnalyzerController],
  providers: [DocumentAnalyzerService],
  exports: [DocumentAnalyzerService],
})
export class DocumentAnalyzerModule {}
