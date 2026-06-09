import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { AiRouterService } from './ai-router.service';
import { GenerateAnswerDto } from './dto/generate-answer.dto';

@ApiTags('ai-router')
@Controller('ai')
export class AiRouterController {
  constructor(
    private readonly aiRouterService: AiRouterService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'AI provayderlar holati va fallback tartibi (admin monitoring uchun)',
    description:
      'Hech qanday API kalit qaytarilmaydi — faqat provayder nomi, sozlanganlik holati va fallback tartibi.',
  })
  status() {
    return { providers: this.aiRouterService.getProviderStatus() };
  }

  /**
   * Dev/staging muhitida AI javob generatsiyasini sinash uchun endpoint.
   * AI_ENABLE_TEST_ENDPOINT=true bo'lmasa 403 qaytariladi.
   * Production'da bu endpoint hech qachon ishlamasligi kerak.
   */
  @Post('test-generate')
  @Public()
  @ApiOperation({
    summary: 'AI huquqiy javob testi (faqat dev/staging, AI_ENABLE_TEST_ENDPOINT=true kerak)',
  })
  async testGenerate(@Body() dto: GenerateAnswerDto) {
    const enabled = this.configService.get<string>('AI_ENABLE_TEST_ENDPOINT');
    if (enabled !== 'true') {
      throw new ForbiddenException('Test endpoint bu muhitda yoqilmagan.');
    }

    if (!dto.context || dto.context.length === 0) {
      throw new BadRequestException('Context bo\'lmasa AI chaqirilmaydi.');
    }

    return this.aiRouterService.generateLegalAnswer({
      userId: dto.userId,
      question: dto.question,
      language: dto.language,
      context: dto.context,
    });
  }
}
