import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMessage, ChatRole, ChatThread, Language, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Threads ────────────────────────────────────────────────────────────────

  async createThread(userId: string, dto: CreateThreadDto): Promise<ChatThread> {
    return this.prisma.chatThread.create({
      data: {
        userId,
        title: dto.title ?? null,
        language: dto.language,
      },
    });
  }

  async getThreads(userId: string): Promise<ChatThread[]> {
    return this.prisma.chatThread.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getThread(
    userId: string,
    threadId: string,
  ): Promise<ChatThread & { messages: ChatMessage[] }> {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!thread) {
      throw new NotFoundException('Chat mavzusi topilmadi');
    }

    if (thread.userId !== userId) {
      throw new ForbiddenException('Bu chat mavzusiga kirish taqiqlangan');
    }

    return thread;
  }

  async updateThread(
    userId: string,
    threadId: string,
    dto: { title?: string },
  ): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, deletedAt: null },
    });

    if (!thread) {
      throw new NotFoundException('Chat mavzusi topilmadi');
    }

    if (thread.userId !== userId) {
      throw new ForbiddenException('Bu chat mavzusiga kirish taqiqlangan');
    }

    return this.prisma.chatThread.update({
      where: { id: threadId },
      data: { title: dto.title },
    });
  }

  async deleteThread(userId: string, threadId: string): Promise<void> {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, deletedAt: null },
    });

    if (!thread) {
      throw new NotFoundException('Chat mavzusi topilmadi');
    }

    if (thread.userId !== userId) {
      throw new ForbiddenException('Bu chat mavzusiga kirish taqiqlangan');
    }

    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  async getMessages(userId: string, threadId: string): Promise<ChatMessage[]> {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, deletedAt: null },
    });

    if (!thread) {
      throw new NotFoundException('Chat mavzusi topilmadi');
    }

    if (thread.userId !== userId) {
      throw new ForbiddenException('Bu chat mavzusiga kirish taqiqlangan');
    }

    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async saveUserMessage(
    threadId: string,
    userId: string,
    content: string,
    _language: Language,
  ): Promise<ChatMessage> {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          threadId,
          userId,
          role: ChatRole.USER,
          content,
        },
      }),
      this.prisma.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async saveAssistantMessage(
    threadId: string,
    userId: string,
    content: string,
    citations: unknown[],
    aiProvider: string,
    aiModel: string,
    promptTokens: number,
    completionTokens: number,
    latencyMs: number,
  ): Promise<ChatMessage> {
    const providerMap: Record<string, 'OPENAI' | 'GEMINI' | 'CLAUDE'> = {
      openai: 'OPENAI',
      gemini: 'GEMINI',
      claude: 'CLAUDE',
    };

    const prismaProvider = providerMap[aiProvider.toLowerCase()] ?? 'OPENAI';

    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          threadId,
          userId,
          role: ChatRole.ASSISTANT,
          content,
          citations: citations as Prisma.InputJsonValue,
          aiProvider: prismaProvider,
          aiModel,
          promptTokens,
          completionTokens,
          latencyMs,
        },
      }),
      this.prisma.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async submitFeedback(
    userId: string,
    messageId: string,
    feedback: 'up' | 'down',
  ): Promise<void> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Xabar topilmadi');
    }

    if (message.userId !== userId) {
      throw new ForbiddenException('Bu xabarga kirish taqiqlangan');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        metadata: {
          ...(message.metadata as Record<string, unknown> | null ?? {}),
          feedback,
          feedbackAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async verifyThreadOwnership(userId: string, threadId: string): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, deletedAt: null },
    });

    if (!thread) {
      throw new NotFoundException('Chat mavzusi topilmadi');
    }

    if (thread.userId !== userId) {
      throw new ForbiddenException('Bu chat mavzusiga kirish taqiqlangan');
    }

    return thread;
  }

  async getRecentMessages(threadId: string, limit = 10): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
