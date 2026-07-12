import { AiProviderName } from '../../config/ai.config';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  /** RAG orqali tayyorlangan rasmiy manba konteksti (system prompt ichiga qo'shiladi) */
  systemPrompt: string;
  messages: AiChatMessage[];
  /** "uz" | "ru" — javob shu tilda qaytarilishi kerak */
  language: 'uz' | 'ru';
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiCompletionResult {
  provider: AiProviderName;
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  /** taxminiy narx (USD), admin monitoring uchun */
  estimatedCostUsd: number;
}

export interface AiProviderClient {
  readonly provider: AiProviderName;
  readonly isConfigured: boolean;
  complete(request: AiCompletionRequest, timeoutMs: number): Promise<AiCompletionResult>;
  /**
   * Javobni bo'lak-bo'lak (token oqimi) qaytaradi. Har bir `yield` — matn deltasi.
   * Provayder qo'llab-quvvatlamasa, AiRouter `complete()` ga qaytadi.
   */
  stream?(request: AiCompletionRequest, timeoutMs: number): AsyncGenerator<string, void, unknown>;
}

export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProviderName,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AiProviderError';
  }
}
