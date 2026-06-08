import { Module } from '@nestjs/common';
import { AiRouterService } from './ai-router.service';
import { AiRouterController } from './ai-router.controller';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';

@Module({
  controllers: [AiRouterController],
  providers: [OpenAiProvider, GeminiProvider, ClaudeProvider, AiRouterService],
  exports: [AiRouterService],
})
export class AiRouterModule {}
