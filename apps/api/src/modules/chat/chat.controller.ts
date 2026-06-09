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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { AiRouterService } from '../../ai-router/ai-router.service';
import type { AiContextItemDto } from '../../ai-router/dto/ai-context-item.dto';
import { AnswerLanguage } from '../../ai-router/dto/generate-answer.dto';

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
  @ApiOperation({ summary: 'Savolni chat mavzusiga yuborish va AI javobini olish' })
  @ApiParam({ name: 'id', description: 'Thread UUID' })
  @ApiResponse({ status: 201, description: 'Foydalanuvchi xabari va AI javobi' })
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

    // 3. Build context from recent thread messages (for conversational continuity)
    const recentMessages = await this.chatService.getRecentMessages(threadId, 6);
    const contextItems: AiContextItemDto[] = recentMessages
      .filter((m) => m.role === 'ASSISTANT' && m.id !== userMessage.id)
      .slice(0, 3)
      .map((m) => ({
        sourceName: 'Adolat AI',
        title: 'Oldingi javob',
        content: m.content.slice(0, 500),
      }));

    // 4. Call AI router
    const aiResult = await this.aiRouterService.generateLegalAnswer({
      userId: user.id,
      question: dto.question,
      language: dto.language as unknown as AnswerLanguage,
      context: contextItems,
    });

    // 5. Extract citations if present in answer (simple heuristic)
    const citations: unknown[] = [];

    // 6. Save assistant message
    const assistantMessage = await this.chatService.saveAssistantMessage(
      threadId,
      user.id,
      aiResult.answer,
      citations,
      aiResult.provider,
      aiResult.model,
      0,
      0,
      aiResult.latencyMs,
    );

    return {
      userMessage,
      assistantMessage,
      meta: {
        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        fallbackUsed: aiResult.fallbackUsed,
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
