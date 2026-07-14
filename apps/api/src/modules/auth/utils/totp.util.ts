import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * RFC 6238 (TOTP) / RFC 4226 (HOTP) implementatsiyasi — tashqi kutubxonasiz,
 * Node `crypto` yordamida. Google Authenticator, Authy va shu kabi ilovalar
 * bilan mos (base32 sirlar, SHA-1, 6 raqam, 30 sekundlik oyna).
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DIGITS = 6;
const PERIOD = 30; // sekund

/** Base32 (RFC 4648, padding'siz) kodlash. */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Base32 dekodlash (padding va katta/kichik harflarga bardoshli). */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Yangi tasodifiy TOTP siri (base32, 20 bayt / 160 bit). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Berilgan hisoblagich (counter) uchun HOTP kodini hisoblaydi. */
function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // 64-bitli big-endian counter (JS raqamlari uchun yuqori 32 bit ~0)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % 10 ** DIGITS;
  return otp.toString().padStart(DIGITS, '0');
}

/** Joriy vaqt uchun TOTP kodi. `atTime` — ms (test uchun). */
export function generateTotp(secret: string, atTime: number = Date.now()): string {
  const counter = Math.floor(atTime / 1000 / PERIOD);
  return hotp(secret, counter);
}

/**
 * Foydalanuvchi kiritgan kodni tekshiradi. `window=1` — soat farqiga bardosh
 * berish uchun oldingi/keyingi oynani ham qabul qiladi. Doimiy-vaqtli solishtiruv.
 */
export function verifyTotp(
  secret: string,
  token: string,
  atTime: number = Date.now(),
  window = 1,
): boolean {
  if (!secret || !token) return false;
  const normalized = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;

  const counter = Math.floor(atTime / 1000 / PERIOD);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const candidate = hotp(secret, counter + errorWindow);
    if (candidate.length === normalized.length) {
      const a = Buffer.from(candidate);
      const b = Buffer.from(normalized);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }
  return false;
}

/**
 * Authenticator ilovasi uchun `otpauth://` URL — QR kod sifatida ko'rsatiladi.
 * QR rasmni mijoz (mobil/admin) shu URL'dan chizadi.
 */
export function buildOtpAuthUrl(secret: string, accountLabel: string, issuer = 'Adolat AI'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
