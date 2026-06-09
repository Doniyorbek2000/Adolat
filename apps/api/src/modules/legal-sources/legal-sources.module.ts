import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { LegalSourcesService } from './legal-sources.service';
import { LegalSourcesController } from './legal-sources.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LegalSourcesController],
  providers: [LegalSourcesService],
  exports: [LegalSourcesService],
})
export class LegalSourcesModule {}
