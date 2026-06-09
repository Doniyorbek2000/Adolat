import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [PrismaModule, AiRouterModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
