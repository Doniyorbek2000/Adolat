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
import { OcrService } from './ocr.service';

const OCR_LIMITS = { fileSize: 20 * 1024 * 1024 }; // 20MB

@ApiTags('OCR')
@ApiBearerAuth()
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  @UseGuards(UsageGuard)
  @UsageType('analysesUsed')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: OCR_LIMITS }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fayldan matn ajratish (rasm=Gemini vision, PDF/DOCX/TXT=matn qatlami)' })
  @ApiResponse({ status: 201, description: 'Ajratilgan matn' })
  async extract(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
  ) {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmagan ('file' maydoni).");
    }
    const lang = language === 'RU' ? 'RU' : 'UZ';
    const result = await this.ocrService.extractText(file.buffer, file.mimetype, lang);
    return {
      message: 'Matn ajratildi',
      data: {
        text: result.text,
        method: result.method,
        imageBased: result.imageBased,
        length: result.text.length,
      },
    };
  }

  @Post('id')
  @UseGuards(UsageGuard)
  @UsageType('analysesUsed')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: OCR_LIMITS }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Passport/ID kartadan tuzilgan maydonlarni ajratish (Gemini structured)' })
  @ApiResponse({ status: 201, description: 'Tuzilgan hujjat maydonlari' })
  async extractId(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmagan ('file' maydoni).");
    }
    const fields = await this.ocrService.extractIdDocument(file.buffer, file.mimetype);
    return { message: 'Hujjat maydonlari ajratildi', data: fields };
  }
}
