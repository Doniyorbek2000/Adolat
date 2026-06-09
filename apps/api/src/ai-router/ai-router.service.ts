import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiRequestStatus, Language, Prisma } from '@prisma/client';

import { AiProviderName, AiSettings } from '../config/ai.config';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderClient,
  AiProviderError,
} from './interfaces/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { PrismaService } from '../database/prisma/prisma.service';
import { buildLegalSystemPrompt } from './prompts/legal-system-prompt';
import type { AiContextItemDto } from './dto/ai-context-item.dto';
import type { AnswerLanguage } from './dto/generate-answer.dto';

export interface AiRouterAttemptLog {
  provider: AiProviderName;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface AiRouterResult extends AiCompletionResult {
  /** Qaysi provayderlar urinib ko'rilgani (monitoring/audit uchun) */
  attempts: AiRouterAttemptLog[];
}

export interface LegalAnswerResult {
  answer: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
}

/** AiProviderName → Prisma AiProvider enum */
const PROVIDER_ENUM_MAP: Record<AiProviderName, AiProvider> = {
  openai: AiProvider.OPENAI,
  gemini: AiProvider.GEMINI,
  claude: AiProvider.CLAUDE,
};

/**
 * AI Router — OpenAI (primary), Claude va Gemini orasida avtomatik fallback zanjirini boshqaradi.
 * Tartib `.env` orqali sozlanadi: AI_PRIMARY_PROVIDER / AI_FALLBACK_PROVIDER / AI_FALLBACK_PROVIDER_2
 *
 * AI faqat backendda ishlaydi, kalitlar mobil/admin frontendga hech qachon yuborilmaydi,
 * va javob faqat RAG context asosida shakllantiriladi (system prompt orqali ta'minlanadi).
 */
@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);
  private readonly clients: Record<AiProviderName, AiProviderClient>;
  private readonly chain: AiProviderName[];
  private readonly timeoutMs: number;
  private readonly retryCount: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<{ ai: AiSettings }, true>,
    openAiProvider: OpenAiProvider,
    geminiProvider: GeminiProvider,
    claudeProvider: ClaudeProvider,
  ) {
    this.clients = {
      openai: openAiProvider,
      gemini: geminiProvider,
      claude: claudeProvider,
    };

    const ai = this.configService.get('ai', { infer: true });
    this.timeoutMs = ai.timeoutMs;
    this.retryCount = ai.retryCount;

    const order: AiProviderName[] = [ai.primaryProvider, ai.fallbackProvider];
    if (ai.fallbackProvider2) {
      order.push(ai.fallbackProvider2);
    }
    // har bir provayder faqat bir marta zanjirda bo'lishi uchun dublikatlarni olib tashlaymiz,
    // so'ngra .env'da ko'rsatilmagan qolgan provayderlarni oxiriga qo'shamiz (resilience uchun)
    const allProviders: AiProviderName[] = ['openai', 'claude', 'gemini'];
    const seen = new Set<AiProviderName>();
    this.chain = [...order, ...allProviders].filter((provider) => {
      if (seen.has(provider)) return false;
      seen.add(provider);
      return true;
    });

    this.logger.log(`AI fallback zanjiri: ${this.chain.join(' -> ')}`);
  }

  /**
   * RAG context asosida javob generatsiya qiladi. Birinchi ishlagan provayderning
   * natijasi qaytariladi; barchasi muvaffaqiyatsiz bo'lsa AiProviderError tashlanadi.
   */
  async complete(request: AiCompletionRequest): Promise<AiRouterResult> {
    const attempts: AiRouterAttemptLog[] = [];

    for (const providerName of this.chain) {
      const client = this.clients[providerName];
      if (!client.isConfigured) {
        continue;
      }

      for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
        const startedAt = Date.now();
        try {
          const result = await client.complete(request, this.timeoutMs);
          attempts.push({ provider: providerName, ok: true, latencyMs: result.latencyMs });
          return { ...result, attempts };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Noma\'lum xatolik';
          attempts.push({
            provider: providerName,
            ok: false,
            latencyMs: Date.now() - startedAt,
            error: message,
          });
          this.logger.warn(
            `${providerName} urinish #${attempt + 1} muvaffaqiyatsiz: ${message}`,
          );
        }
      }
    }

    throw new AiProviderError(
      this.chain[0],
      'Barcha AI provayderlar javob bera olmadi (OpenAI, Claude, Gemini). Iltimos keyinroq urinib ko\'ring.',
      attempts,
    );
  }

  /**
   * RAG context asosida huquqiy javob generatsiya qiladi va natijani ai_requests jadvaliga
   * yozadi. Context bo'sh bo'lsa AI chaqirilmaydi.
   */
  async generateLegalAnswer(input: {
    userId?: string;
    question: string;
    language: AnswerLanguage;
    context: AiContextItemDto[];
  }): Promise<LegalAnswerResult> {
    const primaryProvider = this.chain[0];
    const prismaLanguage = input.language === 'UZ' ? Language.UZ : Language.RU;
    const langCode = input.language === 'UZ' ? 'uz' : 'ru';

    const contextStr = input.context
      .map((item, i) => {
        const lines = [`[${i + 1}] ${item.sourceName} — ${item.title}`];
        if (item.date) lines.push(`Sana: ${item.date}`);
        if (item.url) lines.push(`Havola: ${item.url}`);
        lines.push(item.content);
        return lines.join('\n');
      })
      .join('\n\n---\n\n');

    const systemPrompt = buildLegalSystemPrompt(contextStr);

    const request: AiCompletionRequest = {
      systemPrompt,
      messages: [{ role: 'user', content: input.question }],
      language: langCode,
    };

    let result: AiRouterResult;
    let status: AiRequestStatus;
    let errorMessage: string | undefined;

    try {
      result = await this.complete(request);

      const usedProviders = result.attempts.filter((a) => a.ok).map((a) => a.provider);
      const fallbackUsed =
        usedProviders.length > 0 && usedProviders[usedProviders.length - 1] !== primaryProvider;
      status = fallbackUsed ? AiRequestStatus.FALLBACK_USED : AiRequestStatus.SUCCESS;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Noma\'lum xatolik';
      status = AiRequestStatus.FAILED;

      await this.prisma.aiRequest.create({
        data: {
          userId: input.userId ?? null,
          feature: 'legal_answer',
          language: prismaLanguage,
          primaryProvider: PROVIDER_ENUM_MAP[primaryProvider],
          finalProvider: null,
          finalModel: null,
          status,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0,
          estimatedCostUsd: 0,
          fallbackChain: [],
          errorMessage,
        },
      });

      throw err;
    }

    const successAttempt = result.attempts.find((a) => a.ok);
    const finalProviderName = successAttempt?.provider ?? primaryProvider;
    const fallbackUsed = finalProviderName !== primaryProvider;

    await this.prisma.aiRequest.create({
      data: {
        userId: input.userId ?? null,
        feature: 'legal_answer',
        language: prismaLanguage,
        primaryProvider: PROVIDER_ENUM_MAP[primaryProvider],
        finalProvider: PROVIDER_ENUM_MAP[finalProviderName],
        finalModel: result.model,
        status,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: result.latencyMs,
        estimatedCostUsd: result.estimatedCostUsd,
        fallbackChain: result.attempts as unknown as Prisma.InputJsonValue,
        errorMessage: null,
      },
    });

    return {
      answer: result.content,
      provider: result.provider,
      model: result.model,
      fallbackUsed,
      latencyMs: result.latencyMs,
    };
  }

  /** Admin panel uchun: har provayderning sozlanganlik holatini qaytaradi */
  getProviderStatus(): { provider: AiProviderName; configured: boolean; order: number }[] {
    return this.chain.map((provider, index) => ({
      provider,
      configured: this.clients[provider].isConfigured,
      order: index,
    }));
  }
}
