import {
  base32Decode,
  base32Encode,
  buildOtpAuthUrl,
  generateTotp,
  generateTotpSecret,
  verifyTotp,
} from './totp.util';

describe('TOTP util', () => {
  describe('base32', () => {
    it('round-trips arbitrary bytes', () => {
      const buf = Buffer.from('Hello Adolat 2FA!', 'utf8');
      expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
    });

    it('matches known RFC 4648 vector ("foobar")', () => {
      expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
    });
  });

  describe('generateTotpSecret', () => {
    it('produces a 32-char base32 secret (160-bit)', () => {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    });

    it('is random', () => {
      expect(generateTotpSecret()).not.toBe(generateTotpSecret());
    });
  });

  describe('generateTotp — RFC 6238 SHA-1 vectors', () => {
    // RFC 6238 test seed "12345678901234567890" → base32
    const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

    it.each([
      [59_000, '287082'],
      [1_111_111_109_000, '081804'],
      [1_111_111_111_000, '050471'],
      [2_000_000_000_000, '279037'],
    ])('at t=%ims → %s', (t, expected) => {
      expect(generateTotp(RFC_SECRET, t)).toBe(expected);
    });
  });

  describe('verifyTotp', () => {
    const secret = generateTotpSecret();

    it('accepts the current code', () => {
      const now = Date.now();
      expect(verifyTotp(secret, generateTotp(secret, now), now)).toBe(true);
    });

    it('accepts a code from the previous window (clock drift)', () => {
      const now = Date.now();
      const prev = now - 30_000;
      expect(verifyTotp(secret, generateTotp(secret, prev), now)).toBe(true);
    });

    it('rejects a code outside the window', () => {
      const now = Date.now();
      const old = now - 5 * 60_000;
      expect(verifyTotp(secret, generateTotp(secret, old), now)).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(verifyTotp(secret, '', Date.now())).toBe(false);
      expect(verifyTotp(secret, 'abcdef', Date.now())).toBe(false);
      expect(verifyTotp(secret, '12345', Date.now())).toBe(false);
      expect(verifyTotp('', '123456', Date.now())).toBe(false);
    });

    it('tolerates spaces in the entered code', () => {
      const now = Date.now();
      const code = generateTotp(secret, now);
      const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
      expect(verifyTotp(secret, spaced, now)).toBe(true);
    });
  });

  describe('buildOtpAuthUrl', () => {
    it('builds a scannable otpauth URL', () => {
      const url = buildOtpAuthUrl('JBSWY3DPEHPK3PXP', 'user@example.com');
      expect(url).toContain('otpauth://totp/');
      expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(url).toContain('issuer=Adolat+AI');
      expect(url).toContain('digits=6');
      expect(url).toContain('period=30');
    });
  });
});
