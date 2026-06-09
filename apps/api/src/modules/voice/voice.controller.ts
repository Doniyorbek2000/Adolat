import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { Language } from '@prisma/client';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UsageGuard } from '../../common/guards/usage.guard';
import { UsageType } from '../../common/decorators/usage-type.decorator';
import { VoiceService } from './voice.service';
import { TextToSpeechDto } from './dto/text-to-speech.dto';

@ApiTags('Voice')
@ApiBearerAuth()
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  // ─── POST /voice/transcribe ───────────────────────────────────────────────

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB Whisper limit
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'language'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Audio fayl' },
        language: { type: 'string', enum: ['UZ', 'RU'], description: 'Audio tili' },
      },
    },
  })
  @ApiOperation({ summary: 'Audio faylni matnga aylantirish (Whisper STT)' })
  @ApiResponse({ status: 200, description: 'Transkriptsiya natijasi' })
  async transcribe(
    @UploadedFile() audio: Express.Multer.File,
    @Body('language') language: string,
  ) {
    if (!audio) {
      throw new Error("Audio fayl yuklanmagan. 'audio' maydonini multipart/form-data bilan yuboring.");
    }
    const lang = language === 'RU' ? Language.RU : Language.UZ;
    const transcript = await this.voiceService.transcribe(audio.buffer, audio.mimetype, lang);
    return { transcript };
  }

  // ─── POST /voice/ask ─────────────────────────────────────────────────────

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UsageGuard)
  @UsageType('voiceSecondsUsed')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['audio', 'language'],
      properties: {
        audio: { type: 'string', format: 'binary', description: 'Savol audio fayli' },
        language: { type: 'string', enum: ['UZ', 'RU'], description: 'Savol va javob tili' },
      },
    },
  })
  @ApiOperation({
    summary: 'Ovozli savol yuborish: STT → AI javob → TTS. Transkriptsiya va javob matni qaytariladi.',
  })
  @ApiResponse({ status: 200, description: '{ transcript, answer, sessionId, durationSeconds }' })
  async voiceAsk(
    @CurrentUser() user: RequestUser,
    @UploadedFile() audio: Express.Multer.File,
    @Body('language') language: string,
  ) {
    if (!audio) {
      throw new Error("Audio fayl yuklanmagan. 'audio' maydonini multipart/form-data bilan yuboring.");
    }
    const lang = language === 'RU' ? Language.RU : Language.UZ;
    const result = await this.voiceService.voiceAsk(user.id, audio.buffer, audio.mimetype, lang);

    return {
      transcript: result.transcript,
      answer: result.answer,
      sessionId: result.sessionId,
      durationSeconds: result.durationSeconds,
    };
  }

  // ─── POST /voice/tts ─────────────────────────────────────────────────────

  @Post('tts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Matnni ovozga aylantirish (TTS). MP3 audio buffer qaytariladi.' })
  @ApiProduces('audio/mpeg')
  @ApiResponse({ status: 200, description: 'MP3 audio' })
  async textToSpeech(
    @Body() dto: TextToSpeechDto,
    @Res() res: Response,
  ) {
    const audioBuffer = await this.voiceService.textToSpeech(dto.text, dto.language);

    if (audioBuffer.length === 0) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        message: 'TTS xizmati hozirda mavjud emas (OpenAI sozlanmagan)',
      });
      return;
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'attachment; filename="tts.mp3"',
      'Content-Length': audioBuffer.length.toString(),
    });

    res.end(audioBuffer);
  }

  // ─── GET /voice/sessions ─────────────────────────────────────────────────

  @Get('sessions')
  @ApiOperation({ summary: "Foydalanuvchining ovozli sessiyalar tarixini olish" })
  @ApiResponse({ status: 200, description: "Sessiyalar ro'yxati" })
  getSessions(@CurrentUser() user: RequestUser) {
    return this.voiceService.getSessions(user.id);
  }
}
