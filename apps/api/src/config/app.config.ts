import { registerAs } from '@nestjs/config';

const toList = (value?: string): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export interface AppSettings {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  frontendUrl: string;
  adminUrl: string;
  corsOrigins: string[];
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
}

export default registerAs(
  'app',
  (): AppSettings => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '4000', 10),
    apiPrefix: (process.env.API_PREFIX ?? '/api/v1').replace(/^\/+/, ''),
    frontendUrl: process.env.FRONTEND_URL ?? '',
    adminUrl: process.env.ADMIN_URL ?? '',
    corsOrigins: toList(`${process.env.FRONTEND_URL ?? ''},${process.env.ADMIN_URL ?? ''},${process.env.CORS_ORIGINS ?? ''}`),
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
  }),
);
