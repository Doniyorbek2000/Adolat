import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';

import { DocumentGeneratorService } from './document-generator.service';
import { DocumentGeneratorController } from './document-generator.controller';

@Module({
  imports: [PrismaModule, AiRouterModule],
  controllers: [DocumentGeneratorController],
  providers: [DocumentGeneratorService],
  exports: [DocumentGeneratorService],
})
export class DocumentGeneratorModule {}
