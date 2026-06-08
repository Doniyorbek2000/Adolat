export type AiProvider = 'openai' | 'gemini' | 'claude';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  argon2: {
    memoryCost: number;
    timeCost: number;
  };
  ai: {
    primaryProvider: AiProvider;
    fallbackProvider: AiProvider;
    fallbackProvider2: AiProvider | null;
    timeoutMs: number;
    retryCount: number;
    openai: { apiKey: string; model: string };
    gemini: { apiKey: string; model: string };
    claude: { apiKey: string; model: string };
  };
}

const toList = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toAiProvider = (value: string | undefined, fallback: AiProvider): AiProvider => {
  if (value === 'openai' || value === 'gemini' || value === 'claude') {
    return value;
  }
  return fallback;
};

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api/v1',
  corsOrigins: toList(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '65536', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '3', 10),
  },
  ai: {
    primaryProvider: toAiProvider(process.env.AI_PRIMARY_PROVIDER, 'openai'),
    fallbackProvider: toAiProvider(process.env.AI_FALLBACK_PROVIDER, 'claude'),
    fallbackProvider2: process.env.AI_FALLBACK_PROVIDER_2
      ? toAiProvider(process.env.AI_FALLBACK_PROVIDER_2, 'gemini')
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
  },
});
