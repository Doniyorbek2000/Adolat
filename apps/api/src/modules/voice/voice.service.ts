import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Language, VoiceSession } from '@prisma/client';
import OpenAI from 'openai';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AiRouterService } from '../../ai-router/ai-router.service';
import { AnswerLanguage } from '../../ai-router/dto/generate-answer.dto';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface VoiceAskResult {
  transcript: string;
  answer: string;
  audioBuffer: Buffer;
  durationSeconds: number;
  sessionId: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly openai: OpenAI | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AiRouterService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.openai = null;
      this.logger.warn('OPENAI_API_KEY not configured — voice features will return fallback responses');
    }
  }

  // ─── STT: Speech-to-text ─────────────────────────────────────────────────────

  /**
   * Transcribe audio buffer using OpenAI Whisper.
   * Returns empty string if OpenAI is not configured.
   */
  async transcribe(audioBuffer: Buffer, mimeType: string, language: Language): Promise<string> {
    if (!this.openai) {
      this.logger.warn('Transcription skipped: OpenAI not configured');
      return '';
    }

    const langHint = language === Language.UZ ? 'uz' : 'ru';
    const ext = this.getAudioExtension(mimeType);

    // OpenAI SDK accepts a toFile()-wrapped buffer or a Blob; convert Buffer → ArrayBuffer first
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const file = new File([blob], `audio.${ext}`, { type: mimeType });

    try {
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: langHint,
      });
      return response.text;
    } catch (err) {
      this.logger.error(`Whisper transcription failed: ${String(err)}`);
      throw err;
    }
  }

  // ─── TTS: Text-to-speech ─────────────────────────────────────────────────────

  /**
   * Convert text to speech using OpenAI TTS.
   * Returns empty buffer if OpenAI is not configured.
   */
  async textToSpeech(text: string, _language: Language): Promise<Buffer> {
    if (!this.openai) {
      this.logger.warn('TTS skipped: OpenAI not configured');
      return Buffer.alloc(0);
    }

    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
        response_format: 'mp3',
      });

      // Convert ReadableStream / Response to Buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      this.logger.error(`TTS failed: ${String(err)}`);
      return Buffer.alloc(0);
    }
  }

  // ─── Full voice ask flow ─────────────────────────────────────────────────────

  async voiceAsk(
    userId: string,
    audioBuffer: Buffer,
    mimeType: string,
    language: Language,
  ): Promise<VoiceAskResult> {
    const startTime = Date.now();

    // 1. Transcribe
    const transcript = await this.transcribe(audioBuffer, mimeType, language);

    // 2. Get legal answer
    let answer = '';
    if (transcript) {
      try {
        const aiResult = await this.aiRouter.generateLegalAnswer({
          userId,
          question: transcript,
          language: language === Language.UZ ? AnswerLanguage.UZ : AnswerLanguage.RU,
          context: [],
        });
        answer = aiResult.answer;
      } catch (err) {
        this.logger.error(`AI answer failed for voice ask: ${String(err)}`);
        answer = language === Language.UZ
          ? 'Kechirasiz, hozir javob bera olmayman. Iltimos keyinroq urinib ko\'ring.'
          : 'Извините, я не могу ответить сейчас. Пожалуйста, попробуйте позже.';
      }
    }

    // 3. TTS the answer
    const audioResponseBuffer = answer ? await this.textToSpeech(answer, language) : Buffer.alloc(0);

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);

    // 4. Save session
    const session = await this.prisma.voiceSession.create({
      data: {
        userId,
        transcript: transcript || null,
        responseText: answer || null,
        durationSeconds,
        language,
      },
    });

    return {
      transcript,
      answer,
      audioBuffer: audioResponseBuffer,
      durationSeconds,
      sessionId: session.id,
    };
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async getSessions(userId: string): Promise<VoiceSession[]> {
    return this.prisma.voiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private getAudioExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/mp4': 'mp4',
      'audio/x-m4a': 'm4a',
    };
    return map[mimeType.toLowerCase()] ?? 'mp3';
  }
}
