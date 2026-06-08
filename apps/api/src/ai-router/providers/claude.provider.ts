import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderClient,
  AiProviderError,
} from '../interfaces/ai-provider.interface';
import { fetchWithTimeout } from './fetch-with-timeout';

// Claude Sonnet taxminiy narxlari (USD / 1K token) — admin panelda sozlanadigan qilib ko'chirilishi mumkin
const PRICE_PER_1K_PROMPT = 0.003;
const PRICE_PER_1K_COMPLETION = 0.015;

const ANTHROPIC_API_VERSION = '2023-06-01';

/**
 * Anthropic Claude provider — OpenAI va Gemini'ga qo'shimcha uchinchi AI provayder.
 * Faqat backend orqali chaqiriladi, kalit hech qachon mobil/admin frontendga chiqarilmaydi.
 */
@Injectable()
export class ClaudeProvider implements AiProviderClient {
  readonly provider = 'claude' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const ai = this.configService.get('ai', { infer: true });
    this.apiKey = ai.claude.apiKey;
    this.model = ai.claude.model;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest, timeoutMs: number): Promise<AiCompletionResult> {
    if (!this.isConfigured) {
      throw new AiProviderError(this.provider, 'ANTHROPIC_API_KEY sozlanmagan');
    }

    const startedAt = Date.now();
    const response = await fetchWithTimeout(
      this.provider,
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxOutputTokens ?? 1500,
          temperature: request.temperature ?? 0.2,
          system: request.systemPrompt,
          messages: request.messages.map((message) => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            content: message.content,
          })),
        }),
      },
      timeoutMs,
    );

    const json = (await response.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = json.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n')
      .trim();

    if (!content) {
      throw new AiProviderError(this.provider, 'Bo\'sh javob qaytdi');
    }

    const promptTokens = json.usage?.input_tokens ?? 0;
    const completionTokens = json.usage?.output_tokens ?? 0;

    return {
      provider: this.provider,
      model: this.model,
      content,
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - startedAt,
      estimatedCostUsd:
        (promptTokens / 1000) * PRICE_PER_1K_PROMPT + (completionTokens / 1000) * PRICE_PER_1K_COMPLETION,
    };
  }
}
