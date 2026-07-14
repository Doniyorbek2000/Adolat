import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { UsageGuard } from '../../common/guards/usage.guard';
import { UsageType } from '../../common/decorators/usage-type.decorator';
import { ContractRiskService } from './contract-risk.service';

const LIMITS = { fileSize: 20 * 1024 * 1024 };

@ApiTags('Contract risk')
@ApiBearerAuth()
@Controller('contracts')
export class ContractAnalyzerController {
  constructor(private readonly risk: ContractRiskService) {}

  @Post('risk')
  @UseGuards(UsageGuard)
  @UsageType('analysesUsed')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: LIMITS }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Shartnoma risk-skoring (fayl yoki matn) — modda-bandlar kesimida' })
  @ApiResponse({ status: 201, description: 'Risk ball, bandlar bo\'yicha tahlil va tavsiyalar' })
  async assess(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('text') text?: string,
    @Body('language') language?: string,
  ) {
    const lang = language === 'RU' ? 'RU' : 'UZ';

    if (file) {
      const data = await this.risk.assessFile(file.buffer, file.mimetype, lang);
      return { message: 'Shartnoma tahlil qilindi', data };
    }
    if (text && text.trim().length > 0) {
      const data = await this.risk.assessText(text, lang);
      return { message: 'Shartnoma tahlil qilindi', data };
    }
    throw new BadRequestException("'file' yoki 'text' yuborilishi kerak");
  }
}
