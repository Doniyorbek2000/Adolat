# @adolat/shared

Adolat AI monorepo uchun umumiy kontraktlar paketi: backend (`apps/api`),
admin panel (`apps/admin`) va mobil ilova o'rtasida bo'linadigan
**enum'lar**, **tiplar** va **konstantalar**.

## Nima uchun kerak

Domen enum'lari (masalan `PlanCode`, `PaymentStatus`, `LegalSourceType`) uch
joyda takrorlanib ketishining oldini oladi. Yagona manba shu paketda saqlanadi
va Prisma sxemasi (`apps/api/prisma/schema.prisma`) bilan sinxron bo'ladi.

## Tarkib

- `src/enums.ts` — domen enum'lari (Prisma bilan bir xil qiymatlar)
- `src/types.ts` — API javob formatlari, sahifalash tiplari
- `src/constants.ts` — umumiy konstantalar (til, regex, fayl limitlari, tarif nomlari)

## Ishlatish

```ts
import { PlanCode, SuccessResponseBody, UZ_PHONE_REGEX } from '@adolat/shared';
```

## Qurish

```bash
npm run build --workspace=packages/shared
```

`npm install` paytida `prepare` skripti orqali avtomatik quriladi (`dist/`).
