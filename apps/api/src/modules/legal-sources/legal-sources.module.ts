import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { LegalSourcesService } from './legal-sources.service';
import { LegalSourcesController } from './legal-sources.controller';

@Module({
  imports: [PrismaModule, IngestionModule],
  controllers: [LegalSourcesController],
  providers: [LegalSourcesService],
  exports: [LegalSourcesService],
})
export class LegalSourcesModule {}
