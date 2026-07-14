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
import { CourtPracticeService } from './court-practice.service';

const LIMITS = { fileSize: 20 * 1024 * 1024 };

@ApiTags('Court practice')
@ApiBearerAuth()
@Controller('court-practice')
export class CourtPracticeController {
  constructor(private readonly court: CourtPracticeService) {}

  @Post('analyze')
  @UseGuards(UsageGuard)
  @UsageType('analysesUsed')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: LIMITS }))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Sud qarorini tahlil qilish (fayl yoki matn)' })
  @ApiResponse({ status: 201, description: 'Tuzilgan sud amaliyoti tahlili' })
  async analyze(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('text') text?: string,
    @Body('language') language?: string,
  ) {
    const lang = language === 'RU' ? 'RU' : 'UZ';
    if (file) {
      return { message: 'Sud qarori tahlil qilindi', data: await this.court.analyzeFile(file.buffer, file.mimetype, lang) };
    }
    if (text && text.trim().length > 0) {
      return { message: 'Sud qarori tahlil qilindi', data: await this.court.analyzeText(text, lang) };
    }
    throw new BadRequestException("'file' yoki 'text' yuborilishi kerak");
  }
}
