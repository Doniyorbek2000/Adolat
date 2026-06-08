import { createHash, randomUUID } from 'node:crypto';

const DURATION_PATTERN = /^(\d+)\s*(s|m|h|d|w)?$/i;
const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * "15m" / "30d" / "3600" kabi muddat ifodalarini millisekundlarga aylantiradi
 * (suffiks bo'lmasa soniya deb hisoblanadi — JWT `expiresIn` konvensiyasiga mos).
 */
export function parseDurationToMs(expression: string): number {
  const match = DURATION_PATTERN.exec(expression.trim());
  if (!match) {
    throw new Error(`Yaroqsiz muddat ifodasi: "${expression}"`);
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  return value * UNIT_TO_MS[unit];
}

/** Berilgan muddat ifodasiga ko'ra (masalan "15m") tugash sanasini hisoblaydi. */
export function calculateExpiry(expression: string, from: Date = new Date()): Date {
  return new Date(from.getTime() + parseDurationToMs(expression));
}

/** Refresh token uchun yagona identifikator (JWT `tokenId` da'vosi va DB qatori PK sifatida ishlatiladi). */
export function generateTokenId(): string {
  return randomUUID();
}

/** Refresh tokenni bazada plain holda saqlamaslik uchun bir tomonlama hash qiladi. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
