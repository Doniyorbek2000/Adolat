import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';

import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AiRouterModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  ],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
