# Adolat AI — Bosqichma-bosqich qurilish rejasi

Master-spec 41 bo'limdan iborat (mobil ilova + backend + admin panel uchun to'liq production tizim). Bunday hajmdagi tizim bitta sessiyada to'liq yozilmaydi — shuning uchun loyihani 18 bosqichga bo'lib, har birini to'liq ishlaydigan holatda topshiramiz.

| # | Bosqich | Holat | Eslatma |
|---|---------|-------|---------|
| 1 | Monorepo/project structure | ✅ tayyor | `apps/{mobile,api,admin}`, `packages/shared`, `infra`, `docs` |
| 2 | Backend skeleton (NestJS) | ✅ tayyor | config, validation pipe, logger, Swagger, health check |
| 3 | Database schema (Prisma) | ✅ tayyor | to'liq jadval ro'yxati `prisma/schema.prisma` |
| 4 | Auth (OTP/login/refresh/2FA) | ⏳ keyingi | |
| 5 | Flutter mobile skeleton | ⏳ | theme, routing, localization, network, secure storage |
| 6 | Mobile auth screens | ⏳ | |
| 7 | Home/Dashboard | ⏳ | |
| 8 | AI Router | ✅ tayyor | OpenAI + Gemini + **Claude** (fallback zanjiri, log, cost estimate) |
| 9 | RAG pipeline | ⏳ | source registry, ingestion, chunking, embeddings, retrieval |
| 10 | Legal Chat | ⏳ | |
| 11 | Document Analyzer | ⏳ | |
| 12 | Document Generator | ⏳ | |
| 13 | Voice Assistant | ⏳ | STT/TTS |
| 14 | Subscription/Payment | ⏳ | Click + Payme webhook |
| 15 | Admin panel | ⏳ | Next.js + Tailwind + shadcn/ui |
| 16 | Security hardening | ⏳ | rate limit, audit, file scan, prompt injection |
| 17 | Tests | ⏳ | |
| 18 | Docker/deployment | ⏳ | |

## AI provayderlar haqida eslatma

Master-promptda faqat OpenAI (primary) va Gemini (fallback) ko'rsatilgan edi. Foydalanuvchi so'rovi bo'yicha **Claude (Anthropic)** ham AI router'ga uchinchi provayder sifatida qo'shildi — `AI_PRIMARY_PROVIDER` / `AI_FALLBACK_PROVIDER` / `AI_FALLBACK_PROVIDER_2` orqali har qanday tartibda tanlanishi mumkin (`openai` | `gemini` | `claude`). Barcha provayder kalitlar faqat backend `.env` faylida saqlanadi.
