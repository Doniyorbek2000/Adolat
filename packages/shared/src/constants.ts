/**
 * Umumiy konstantalar — barcha ilovalar uchun yagona qiymatlar manbai.
 */

export const APP_NAME = 'Adolat AI';

/** Backend API standart prefiksi (`apps/api` main.ts bilan mos). */
export const API_PREFIX = 'api';

/** Qo'llab-quvvatlanadigan interfeys tillari. */
export const SUPPORTED_LOCALES = ['uz', 'ru'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'uz';

/** Sahifalash standart qiymatlari. */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** O'zbekiston telefon raqami formati: +998 XX XXX XX XX. */
export const UZ_PHONE_REGEX = /^\+998\d{9}$/;

/** Fayl yuklash standart cheklovi (MB). */
export const DEFAULT_MAX_FILE_SIZE_MB = 20;

/** Ruxsat etilgan hujjat MIME turlari (yuklash/tahlil uchun). */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

/** Ruxsat etilgan audio MIME turlari (ovozli yordamchi uchun). */
export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
] as const;

/** Foydalanuvchiga ko'rinadigan tarif nomlari (UZ). */
export const PLAN_LABELS_UZ: Record<string, string> = {
  FREE: 'Bepul',
  ODDIY: 'Oddiy',
  PRO: 'Pro',
  BUSINESS: 'Biznes',
  VIP: 'VIP',
  PAY_AS_YOU_GO: "Har foydalanish uchun to'lov",
};
