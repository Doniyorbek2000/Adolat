-- 2FA (TOTP) siri uchun ustun. Faqat isTwoFaEnabled=true bo'lganda ishlatiladi.
ALTER TABLE "users" ADD COLUMN "two_fa_secret" TEXT;
