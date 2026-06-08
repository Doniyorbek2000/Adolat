import * as Joi from 'joi';

/**
 * Ilova ishga tushishidan oldin barcha muhim environment o'zgaruvchilarini tekshiradi.
 * Agar majburiy qiymat yo'q yoki noto'g'ri formatda bo'lsa, ilova darhol to'xtaydi —
 * bu production'da "yashirin" konfiguratsiya xatolarining oldini oladi.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().default('/api/v1'),

  FRONTEND_URL: Joi.string().uri().allow('').default(''),
  ADMIN_URL: Joi.string().uri().allow('').default(''),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  ARGON2_MEMORY_COST: Joi.number().default(65536),
  ARGON2_TIME_COST: Joi.number().default(3),

  AI_PRIMARY_PROVIDER: Joi.string().valid('openai', 'gemini', 'claude').default('openai'),
  AI_FALLBACK_PROVIDER: Joi.string().valid('openai', 'gemini', 'claude').default('gemini'),
  AI_FALLBACK_PROVIDER_2: Joi.string().valid('openai', 'gemini', 'claude').allow('').default(''),
  AI_TIMEOUT_MS: Joi.number().default(30000),
  AI_RETRY_COUNT: Joi.number().default(2),

  OPENAI_API_KEY: Joi.string().allow('').default(''),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),

  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-1.5-flash'),

  ANTHROPIC_API_KEY: Joi.string().allow('').default(''),
  ANTHROPIC_MODEL: Joi.string().default('claude-sonnet-4-6'),

  S3_ENDPOINT: Joi.string().allow('').default(''),
  S3_REGION: Joi.string().allow('').default(''),
  S3_BUCKET: Joi.string().allow('').default(''),
  S3_ACCESS_KEY: Joi.string().allow('').default(''),
  S3_SECRET_KEY: Joi.string().allow('').default(''),

  CLICK_MERCHANT_ID: Joi.string().allow('').default(''),
  CLICK_SERVICE_ID: Joi.string().allow('').default(''),
  CLICK_SECRET_KEY: Joi.string().allow('').default(''),

  PAYME_MERCHANT_ID: Joi.string().allow('').default(''),
  PAYME_SECRET_KEY: Joi.string().allow('').default(''),

  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.alternatives().try(Joi.number().port(), Joi.string().valid('')).default(''),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),

  ADMIN_DEFAULT_EMAIL: Joi.string().email({ tlds: false }).required(),
  ADMIN_DEFAULT_PASSWORD: Joi.string().min(8).required(),
}).unknown(true);
