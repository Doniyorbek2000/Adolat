import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { AiRouterService } from '../../ai-router/ai-router.service';
import type { AiContextItemDto } from '../../ai-router/dto/ai-context-item.dto';
import { AnswerLanguage } from '../../ai-router/dto/generate-answer.dto';
import { UsageGuard } from '../../common/guards/usage.guard';
import { UsageType } from '../../common/decorators/usage-type.decorator';
import { RagService } from '../rag/rag.service';

import { ChatService } from './chat.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly aiRouterService: AiRouterService,
    private readonly ragService: RagService,
  ) {}

  // ─── Threads ──────────────────────────────────────────────────────────────

  @Post('threads')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi chat mavzusini yaratish' })
  @ApiResponse({ status: 201, description: 'Chat mavzusi muvaffaqiyatli yaratildi' })
  createThread(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateThreadDto,
  ) {
    return this.chatService.createThread(user.id, dto);
  }

  @Get('threads')
  @ApiOperation({ summary: "Foydalanuvchining barcha chat mavzularini olish" })
  @ApiResponse({ status: 200, description: 'Chat mavzulari ro\'yxati' })
  getThreads(@CurrentUser() user: RequestUser) {
    return this.chatService.getThreads(user.id);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Chat mavzusini xabarlari bilan olish' })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  @ApiResponse({ status: 200, description: 'Chat mavzusi va xabarlari' })
  @ApiResponse({ status: 404, description: 'Chat mavzusi topilmadi' })
  getThread(
    @CurrentUser() user: RequestUser,
    @Param('id') threadId: string,
  ) {
    return this.chatService.getThread(user.id, threadId);
  }

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Chat mavzusini yangilash (sarlavha)' })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  @ApiResponse({ status: 200, description: 'Chat mavzusi yangilandi' })
  updateThread(
    @CurrentUser() user: RequestUser,
    @Param('id') threadId: string,
    @Body() dto: UpdateThreadDto,
  ) {
    return this.chatService.updateThread(user.id, threadId, dto);
  }

  @Delete('threads/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Chat mavzusini o'chirish (soft delete)" })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  @ApiResponse({ status: 204, description: "Chat mavzusi o'chirildi" })
  async deleteThread(
    @CurrentUser() user: RequestUser,
    @Param('id') threadId: string,
  ) {
    await this.chatService.deleteThread(user.id, threadId);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  @Post('threads/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UsageGuard)
  @UsageType('questionsUsed')
  @ApiOperation({ summary: 'Savolni chat mavzusiga yuborish va AI javobini olish' })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  @ApiResponse({ status: 201, description: 'Foydalanuvchi xabari, AI javobi va manbalar' })
  @ApiResponse({ status: 402, description: 'Obuna limiti tugagan' })
  @ApiResponse({ status: 404, description: 'Chat mavzusi topilmadi' })
  async sendMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    // 1. Verify thread ownership
    await this.chatService.verifyThreadOwnership(user.id, threadId);

    // 2. Save user message
    const userMessage = await this.chatService.saveUserMessage(
      threadId,
      user.id,
      dto.question,
      dto.language,
    );

    // 3. RAG: qonuniy hujjatlar bazasidan kontekst qidirish
    const lang = (dto.language as string) === 'RU' ? 'RU' : 'UZ';
    let ragContext = await this.ragService.findContext(dto.question, lang).catch(() => null);

    // 4. Build context items: RAG chunks first, then recent conversation for continuity
    const contextItems: AiContextItemDto[] = [];

    if (ragContext && ragContext.chunks.length > 0) {
      // RAG natijalarini context sifatida qo'sh
      for (const chunk of ragContext.chunks.slice(0, 5)) {
        contextItems.push({
          sourceName: chunk.sourceName,
          title: chunk.documentTitle,
          content: chunk.content,
          url: chunk.documentUrl || undefined,
        });
      }
    }

    // Recent assistant messages for conversational continuity (max 2)
    const recentMessages = await this.chatService.getRecentMessages(threadId, 6);
    const conversationContext = recentMessages
      .filter((m) => m.role === 'ASSISTANT' && m.id !== userMessage.id)
      .slice(0, 2)
      .map((m) => ({
        sourceName: 'Adolat AI',
        title: 'Oldingi javob',
        content: m.content.slice(0, 400),
      }));
    contextItems.push(...conversationContext);

    // 5. AI prompt: agar RAG kontekst yo'q bo'lsa ehtiyotkor javob
    const hasLegalContext = ragContext && ragContext.hasSufficientContext;
    const questionWithHint = hasLegalContext
      ? dto.question
      : `${dto.question}\n\n[ESLATMA: Hujjatlar bazasidan aniq manba topilmadi. Umumiy huquqiy bilimlar asosida ehtiyotkor javob ber.]`;

    // 6. Call AI router
    const aiResult = await this.aiRouterService.generateLegalAnswer({
      userId: user.id,
      question: questionWithHint,
      language: dto.language as unknown as AnswerLanguage,
      context: contextItems.length > 0 ? contextItems : [
        {
          sourceName: 'Adolat AI',
          title: 'Kontekst',
          content: "Hujjatlar bazasidan tegishli manba topilmadi.",
        },
      ],
    });

    // 7. Build sources metadata from RAG chunks (top-5)
    const sources = ragContext?.chunks.slice(0, 5).map((c) => ({
      sourceName: c.sourceName,
      title: c.documentTitle,
      url: c.documentUrl.startsWith('manual://') ? null : c.documentUrl,
      articleRef: c.articleRef ?? null,
      excerpt: c.content.slice(0, 300).replace(/\s+/g, ' ').trim(),
      similarity: Math.round(c.similarity * 100) / 100,
    })) ?? [];

    // 8. Save assistant message with citations
    const assistantMessage = await this.chatService.saveAssistantMessage(
      threadId,
      user.id,
      aiResult.answer,
      sources,
      aiResult.provider,
      aiResult.model,
      0,
      0,
      aiResult.latencyMs,
    );

    return {
      userMessage,
      assistantMessage,
      sources,
      meta: {
        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        fallbackUsed: aiResult.fallbackUsed,
        ragUsed: ragContext !== null && ragContext.chunks.length > 0,
        ragChunksFound: ragContext?.chunks.length ?? 0,
      },
    };
  }

  // ─── Feedback ─────────────────────────────────────────────────────────────

  @Post('messages/:id/feedback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "AI javobini baholash (up/down)" })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({ status: 204, description: 'Baho saqlandi' })
  async submitFeedback(
    @CurrentUser() user: RequestUser,
    @Param('id') messageId: string,
    @Body() dto: SubmitFeedbackDto,
  ) {
    await this.chatService.submitFeedback(user.id, messageId, dto.feedback);
  }
}
