import { registerAs } from '@nestjs/config';

export interface RedisSettings {
  url: string;
}

/** Redis ulanishi keyingi bosqichlarda (sessions, queues, cache) ishlatiladi. */
export default registerAs(
  'redis',
  (): RedisSettings => ({
    url: process.env.REDIS_URL ?? '',
  }),
);
