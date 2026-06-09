import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { StorageService } from './storage/storage.service';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  controllers: [FilesController],
  providers: [StorageService, FilesService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
