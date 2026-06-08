import * as argon2 from 'argon2';

export interface Argon2Options {
  memoryCost: number;
  timeCost: number;
}

/** Parolni Argon2id algoritmi bilan, konfiguratsiyadagi memory/time cost'lar bilan hash qiladi. */
export function hashPassword(password: string, options: Argon2Options): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: options.memoryCost,
    timeCost: options.timeCost,
  });
}

/** Berilgan parolni saqlangan Argon2 hash bilan solishtiradi. */
export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
