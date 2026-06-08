import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiRouterService } from './ai-router.service';

@ApiTags('ai-router')
@Controller('ai/status')
export class AiRouterController {
  constructor(private readonly aiRouterService: AiRouterService) {}

  @Get()
  @ApiOperation({
    summary: 'AI provayderlar holati va fallback tartibi (admin monitoring uchun)',
    description:
      'Hech qanday API kalit qaytarilmaydi — faqat provayder nomi, sozlanganlik holati va fallback tartibi.',
  })
  status() {
    return { providers: this.aiRouterService.getProviderStatus() };
  }
}
