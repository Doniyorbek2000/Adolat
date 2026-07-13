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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { CitationService } from '../rag/services/citation.service';
import { WebSearchService } from '../web-search/web-search.service';

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
    private readonly citationService: CitationService,
    private readonly webSearch: WebSearchService,
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
    const prep = await this.prepareAnswer(user, threadId, dto);

    const aiResult = await this.aiRouterService.generateLegalAnswer({
      userId: user.id,
      question: prep.questionWithHint,
      language: dto.language as unknown as AnswerLanguage,
      context: prep.aiContext,
    });

    // Citation Engine: majburiy manba bloki + ishonch % (master-spec 4-bo'lim)
    const citation = this.citationService.build(prep.ragContext?.chunks ?? [], prep.lang);
    const answerWithCitations = `${aiResult.answer.trim()}\n\n${citation.footer}`;

    const assistantMessage = await this.chatService.saveAssistantMessage(
      threadId,
      user.id,
      answerWithCitations,
      citation.citations,
      aiResult.provider,
      aiResult.model,
      0,
      0,
      aiResult.latencyMs,
    );

    return {
      userMessage: prep.userMessage,
      assistantMessage,
      sources: citation.citations,
      meta: {
        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        fallbackUsed: aiResult.fallbackUsed,
        ragUsed: prep.ragUsed,
        ragChunksFound: prep.ragChunksFound,
        confidence: citation.confidence,
        hasSources: citation.hasSources,
        lastUpdated: citation.lastUpdated,
      },
    };
  }

  // ─── Shared preparation (RAG + context) ─────────────────────────────────────

  private async prepareAnswer(
    user: RequestUser,
    threadId: string,
    dto: SendMessageDto,
  ) {
    await this.chatService.verifyThreadOwnership(user.id, threadId);

    const userMessage = await this.chatService.saveUserMessage(
      threadId,
      user.id,
      dto.question,
      dto.language,
    );

    const lang = (dto.language as string) === 'RU' ? 'RU' : 'UZ';
    const ragContext = await this.ragService.findContext(dto.question, lang).catch(() => null);

    const contextItems: AiContextItemDto[] = [];
    if (ragContext && ragContext.chunks.length > 0) {
      for (const chunk of ragContext.chunks.slice(0, 5)) {
        contextItems.push({
          sourceName: chunk.sourceName,
          title: chunk.documentTitle,
          content: chunk.content,
          url: chunk.documentUrl || undefined,
        });
      }
    }

    // So'nggi assistant javoblari — suhbat uzviyligi uchun (maks 2)
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

    // Lokal bazada yetarli manba bo'lmasa — rasmiy manbalardan veb-qidiruv (fallback)
    let webAdded = false;
    if ((!ragContext || !ragContext.hasSufficientContext) && this.webSearch.isConfigured) {
      const webResults = await this.webSearch.search(dto.question, 4).catch(() => []);
      for (const r of webResults) {
        contextItems.push({ sourceName: new URL(r.url).hostname, title: r.title, content: r.snippet, url: r.url });
        webAdded = true;
      }
    }

    const hasLegalContext = Boolean(ragContext && ragContext.hasSufficientContext) || webAdded;
    const questionWithHint = hasLegalContext
      ? dto.question
      : `${dto.question}\n\n[ESLATMA: Hujjatlar bazasidan aniq manba topilmadi. Umumiy huquqiy bilimlar asosida ehtiyotkor javob ber.]`;

    const aiContext: AiContextItemDto[] =
      contextItems.length > 0
        ? contextItems
        : [
            {
              sourceName: 'Adolat AI',
              title: 'Kontekst',
              content: "Hujjatlar bazasidan tegishli manba topilmadi.",
            },
          ];

    return {
      userMessage,
      ragContext,
      lang: lang as 'UZ' | 'RU',
      questionWithHint,
      aiContext,
      ragUsed: ragContext !== null && ragContext.chunks.length > 0,
      ragChunksFound: ragContext?.chunks.length ?? 0,
    };
  }

  // ─── Streaming (SSE) ────────────────────────────────────────────────────────

  @Post('threads/:id/messages/stream')
  @UseGuards(UsageGuard)
  @UsageType('questionsUsed')
  @ApiOperation({ summary: 'Savolni yuborish va AI javobini SSE oqimi sifatida olish' })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  async streamMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') threadId: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx bufferini o'chiradi
    res.flushHeaders();

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const prep = await this.prepareAnswer(user, threadId, dto);
      send('user', { id: prep.userMessage.id });

      const result = await this.aiRouterService.streamLegalAnswer(
        {
          userId: user.id,
          question: prep.questionWithHint,
          language: dto.language as unknown as AnswerLanguage,
          context: prep.aiContext,
        },
        (delta) => send('token', { delta }),
      );

      // Citation footer — oqim oxirida qo'shiladi
      const citation = this.citationService.build(prep.ragContext?.chunks ?? [], prep.lang);
      send('token', { delta: `\n\n${citation.footer}` });

      const fullAnswer = `${result.answer.trim()}\n\n${citation.footer}`;
      const assistantMessage = await this.chatService.saveAssistantMessage(
        threadId,
        user.id,
        fullAnswer,
        citation.citations,
        result.provider,
        result.model,
        0,
        0,
        result.latencyMs,
      );

      send('done', {
        assistantMessageId: assistantMessage.id,
        sources: citation.citations,
        meta: {
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          fallbackUsed: result.fallbackUsed,
          ragUsed: prep.ragUsed,
          ragChunksFound: prep.ragChunksFound,
          confidence: citation.confidence,
          hasSources: citation.hasSources,
          lastUpdated: citation.lastUpdated,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI javob bera olmadi';
      send('error', { message });
    } finally {
      res.end();
    }
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
