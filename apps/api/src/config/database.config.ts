import { registerAs } from '@nestjs/config';

export interface DatabaseSettings {
  url: string;
}

/**
 * Bu bosqichda backend hali bazaga ulanmaydi (DB connection keyingi bosqichda),
 * lekin konfiguratsiya tayyor bo'lishi uchun shu yerda e'lon qilinadi.
 */
export default registerAs(
  'database',
  (): DatabaseSettings => ({
    url: process.env.DATABASE_URL ?? '',
  }),
);
