import { registerAs } from '@nestjs/config';

export type AiProviderName = 'openai' | 'gemini' | 'claude';

export interface AiSettings {
  primaryProvider: AiProviderName;
  fallbackProvider: AiProviderName;
  fallbackProvider2: AiProviderName | null;
  timeoutMs: number;
  retryCount: number;
  openai: { apiKey: string; model: string };
  gemini: { apiKey: string; model: string };
  claude: { apiKey: string; model: string };
}

const toProvider = (value: string | undefined, fallback: AiProviderName): AiProviderName =>
  value === 'openai' || value === 'gemini' || value === 'claude' ? value : fallback;

/**
 * AI Router konfiguratsiyasi. Master-spec OpenAI + Gemini'ni ko'rsatgan,
 * loyiha davomida Claude (Anthropic) ham uchinchi provayder sifatida qo'shildi —
 * fallback tartibi to'liq .env orqali boshqariladi.
 */
export default registerAs(
  'ai',
  (): AiSettings => ({
    primaryProvider: toProvider(process.env.AI_PRIMARY_PROVIDER, 'openai'),
    fallbackProvider: toProvider(process.env.AI_FALLBACK_PROVIDER, 'gemini'),
    fallbackProvider2: process.env.AI_FALLBACK_PROVIDER_2
      ? toProvider(process.env.AI_FALLBACK_PROVIDER_2, 'claude')
      : null,
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? '30000', 10),
    retryCount: parseInt(process.env.AI_RETRY_COUNT ?? '2', 10),
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY ?? '',
      model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? '',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    },
  }),
);
