import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AppConfig } from '../config/configuration';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderClient,
  AiProviderError,
} from './interfaces/ai-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';

export interface AiRouterAttemptLog {
  provider: AiProvider;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface AiRouterResult extends AiCompletionResult {
  /** Qaysi provayderlar urinib ko'rilgani (monitoring/audit uchun) */
  attempts: AiRouterAttemptLog[];
}

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
  private readonly clients: Record<AiProvider, AiProviderClient>;
  private readonly chain: AiProvider[];
  private readonly timeoutMs: number;
  private readonly retryCount: number;

  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
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

    const order: AiProvider[] = [ai.primaryProvider, ai.fallbackProvider];
    if (ai.fallbackProvider2) {
      order.push(ai.fallbackProvider2);
    }
    // har bir provayder faqat bir marta zanjirda bo'lishi uchun dublikatlarni olib tashlaymiz,
    // so'ngra .env'da ko'rsatilmagan qolgan provayderlarni oxiriga qo'shamiz (resilience uchun)
    const allProviders: AiProvider[] = ['openai', 'claude', 'gemini'];
    const seen = new Set<AiProvider>();
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

  /** Admin panel uchun: har provayderning sozlanganlik holatini qaytaradi */
  getProviderStatus(): { provider: AiProvider; configured: boolean; order: number }[] {
    return this.chain.map((provider, index) => ({
      provider,
      configured: this.clients[provider].isConfigured,
      order: index,
    }));
  }
}
