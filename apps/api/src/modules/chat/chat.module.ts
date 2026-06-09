import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AiRouterModule } from '../../ai-router/ai-router.module';
import { RagModule } from '../rag/rag.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [PrismaModule, AiRouterModule, RagModule, SubscriptionsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
