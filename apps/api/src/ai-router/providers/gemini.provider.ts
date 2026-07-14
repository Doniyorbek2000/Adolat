import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiSettings } from '../../config/ai.config';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProviderClient,
  AiProviderError,
} from '../interfaces/ai-provider.interface';
import { fetchWithTimeout } from './fetch-with-timeout';

// gemini-1.5-flash taxminiy narxlari (USD / 1K token)
const PRICE_PER_1K_PROMPT = 0.000075;
const PRICE_PER_1K_COMPLETION = 0.0003;

@Injectable()
export class GeminiProvider implements AiProviderClient {
  readonly provider = 'gemini' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<{ ai: AiSettings }, true>) {
    const ai = this.configService.get('ai', { infer: true });
    this.apiKey = ai.gemini.apiKey;
    this.model = ai.gemini.model;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** generateContent / streamGenerateContent uchun umumiy so'rov tanasi. */
  private buildBody(request: AiCompletionRequest): string {
    return JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: request.systemPrompt }] },
      contents: request.messages.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxOutputTokens ?? 1500,
      },
    });
  }

  /**
   * Javobni SSE oqimi sifatida qaytaradi (`streamGenerateContent?alt=sse`).
   * Har bir `yield` — matn deltasi.
   */
  async *stream(request: AiCompletionRequest, timeoutMs: number): AsyncGenerator<string> {
    if (!this.isConfigured) {
      throw new AiProviderError(this.provider, 'GEMINI_API_KEY sozlanmagan');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: this.buildBody(request),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok || !response.body) {
      throw new AiProviderError(this.provider, `stream HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          const text = json.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? '')
            .join('');
          if (text) yield text;
        } catch {
          // to'liq bo'lmagan JSON bo'lagi — keyingi o'qishda birlashadi
        }
      }
    }
  }

  async complete(request: AiCompletionRequest, timeoutMs: number): Promise<AiCompletionResult> {
    if (!this.isConfigured) {
      throw new AiProviderError(this.provider, 'GEMINI_API_KEY sozlanmagan');
    }

    const startedAt = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetchWithTimeout(
      this.provider,
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.buildBody(request),
      },
      timeoutMs,
    );

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const content = json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim();

    if (!content) {
      throw new AiProviderError(this.provider, 'Bo\'sh javob qaytdi');
    }

    const promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = json.usageMetadata?.candidatesTokenCount ?? 0;

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
