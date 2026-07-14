import * as Sentry from '@sentry/node';

let enabled = false;

/**
 * Sentry'ni ishga tushiradi (faqat SENTRY_DSN berilgan bo'lsa).
 * Kalit yo'q bo'lsa jimgina o'chirilgan holatda qoladi.
 */
export function initSentry(dsn: string | undefined, environment: string): boolean {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 0.1,
  });
  enabled = true;
  return true;
}

export function isSentryEnabled(): boolean {
  return enabled;
}

/** Xatoni Sentry'ga yuboradi (yoqilgan bo'lsa). */
export function captureException(err: unknown): void {
  if (enabled) {
    Sentry.captureException(err);
  }
}
