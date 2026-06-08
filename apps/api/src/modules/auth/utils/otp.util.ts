import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

const OTP_LENGTH = 6;

/** Kriptografik jihatdan ishonchli, OTP_LENGTH xonali raqamli kod yaratadi (masalan "048213"). */
export function generateOtpCode(): string {
  let code = '';
  for (let i = 0; i < OTP_LENGTH; i += 1) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

/**
 * OTP kodini bazada saqlash uchun bir tomonlama hash qiladi.
 * Kodlar qisqa muddatli, raqamli va urinishlar soni cheklangani uchun
 * tezkor SHA-256 yetarli (Argon2 bu yerda keraksiz CPU xarajatini beradi).
 */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** OTP kodini saqlangan hash bilan vaqt-xavfsiz (timing-safe) usulda solishtiradi. */
export function verifyOtpCode(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtpCode(code), 'hex');
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(candidate, expected);
}

/** Joriy vaqtdan boshlab `minutes` daqiqadan so'ng tugaydigan muddatni hisoblaydi. */
export function getOtpExpiry(minutes: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + minutes * 60_000);
}
