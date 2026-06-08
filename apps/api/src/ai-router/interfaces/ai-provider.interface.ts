import { AiProvider } from '../../config/configuration';

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
  provider: AiProvider;
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  /** taxminiy narx (USD), admin monitoring uchun */
  estimatedCostUsd: number;
}

export interface AiProviderClient {
  readonly provider: AiProvider;
  readonly isConfigured: boolean;
  complete(request: AiCompletionRequest, timeoutMs: number): Promise<AiCompletionResult>;
}

export class AiProviderError extends Error {
  constructor(
    public readonly provider: AiProvider,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AiProviderError';
  }
}
