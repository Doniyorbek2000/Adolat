# Adolat AI — Bosqichma-bosqich qurilish rejasi

Master-spec 41 bo'limdan iborat (mobil ilova + backend + admin panel uchun to'liq production tizim). Bunday hajmdagi tizim bitta sessiyada to'liq yozilmaydi — shuning uchun loyihani 18 bosqichga bo'lib, har birini to'liq ishlaydigan holatda topshiramiz.

| # | Bosqich | Holat | Eslatma |
|---|---------|-------|---------|
| 1 | Monorepo/project structure | ✅ tayyor | `apps/{mobile,api,admin}`, `packages/shared`, `infra`, `docs` |
| 2 | Backend skeleton (NestJS) | ✅ tayyor | config, validation pipe, logger, Swagger, health check |
| 3 | Database schema (Prisma) | ✅ tayyor | to'liq jadval ro'yxati `prisma/schema.prisma` |
| 4 | Auth (OTP/login/refresh/2FA) | ✅ tayyor | JWT access/refresh, OTP, 2FA, sessiyalar, parol tiklash |
| 5 | Flutter mobile skeleton | ✅ tayyor | theme, routing, localization, network, secure storage |
| 6 | Mobile auth screens | ✅ tayyor | |
| 7 | Home/Dashboard | ✅ tayyor | |
| 8 | AI Router | ✅ tayyor | OpenAI + Gemini + **Claude** (fallback zanjiri, log, cost estimate) |
| 9 | RAG pipeline | ✅ tayyor | source registry, ingestion, chunking, embeddings, retrieval |
| 10 | Legal Chat | ✅ tayyor | |
| 11 | Document Analyzer | ✅ tayyor | |
| 12 | Document Generator | ✅ tayyor | |
| 13 | Voice Assistant | ✅ tayyor | Whisper STT + OpenAI TTS |
| 14 | Subscription/Payment | ✅ tayyor | Click + Payme webhook (imzo tekshiruvi) |
| 15 | Admin panel | ✅ tayyor | Next.js + Tailwind |
| 16 | Security hardening | ✅ tayyor | helmet, CORS whitelist, throttler, audit-log |
| 17 | Tests | 🟡 qisman | asosiy modullar (auth, ai-router, payments, chat...) qoplangan; qamrov kengaytirilmoqda |
| 18 | Docker/deployment | 🟡 qisman | docker-compose + nginx tayyor; CI `.github/workflows/ci.yml` |

## Ma'lum texnik qarzlar (keyingi bosqichlar uchun)

- **RAG masshtablash**: `retrieval.service.ts` chunk'larni xotiraga yuklab cosine
  similarity'ni JS'da hisoblaydi. Katta hajmda `pgvector` + SQL vektor qidiruvga
  o'tkazish tavsiya etiladi.
- **Push**: FCM HTTP v1 API'ga ko'chirildi (legacy server-key API o'chirilgan).
  Ishlashi uchun service account (`FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY`) kerak.
- **Test qamrovi**: e2e va qolgan servislar uchun testlar qo'shilishi kerak.

## AI provayderlar haqida eslatma

Master-promptda faqat OpenAI (primary) va Gemini (fallback) ko'rsatilgan edi. Foydalanuvchi so'rovi bo'yicha **Claude (Anthropic)** ham AI router'ga uchinchi provayder sifatida qo'shildi — `AI_PRIMARY_PROVIDER` / `AI_FALLBACK_PROVIDER` / `AI_FALLBACK_PROVIDER_2` orqali har qanday tartibda tanlanishi mumkin (`openai` | `gemini` | `claude`). Barcha provayder kalitlar faqat backend `.env` faylida saqlanadi.
