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

// gpt-4o-mini taxminiy narxlari (USD / 1K token) — admin panelda sozlanadigan qilib ko'chirilishi mumkin
const PRICE_PER_1K_PROMPT = 0.00015;
const PRICE_PER_1K_COMPLETION = 0.0006;

@Injectable()
export class OpenAiProvider implements AiProviderClient {
  readonly provider = 'openai' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const ai = this.configService.get('ai', { infer: true });
    this.apiKey = ai.openai.apiKey;
    this.model = ai.openai.model;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: AiCompletionRequest, timeoutMs: number): Promise<AiCompletionResult> {
    if (!this.isConfigured) {
      throw new AiProviderError(this.provider, 'OPENAI_API_KEY sozlanmagan');
    }

    const startedAt = Date.now();
    const response = await fetchWithTimeout(
      this.provider,
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.maxOutputTokens ?? 1500,
          messages: [{ role: 'system', content: request.systemPrompt }, ...request.messages],
        }),
      },
      timeoutMs,
    );

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AiProviderError(this.provider, 'Bo\'sh javob qaytdi');
    }

    const promptTokens = json.usage?.prompt_tokens ?? 0;
    const completionTokens = json.usage?.completion_tokens ?? 0;

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
