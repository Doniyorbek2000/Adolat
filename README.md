# Adolat AI

O'zbekiston bozori uchun professional huquqiy AI platformasi: Flutter mobil ilova, NestJS backend va web admin panel.

## Monorepo strukturasi

```
apps/
  mobile/   — Flutter mobil ilova (Android/iOS)
  api/      — NestJS backend (REST API, RAG, AI router, auth, payments)
  admin/    — Web admin panel (Next.js + Tailwind + shadcn/ui)
packages/
  shared/   — umumiy tiplar, DTO kontraktlari, konstantalar
infra/      — Docker, docker-compose, deployment konfiguratsiyalari
docs/       — arxitektura va bosqichma-bosqich hujjatlar
```

## Qurilish bosqichlari (roadmap)

Loyiha 18 bosqichda quriladi (`docs/ROADMAP.md` ga qarang):

1. ✅ Monorepo/project structure (`packages/shared` umumiy kontraktlar bilan)
2. ✅ Backend skeleton (NestJS, config, validation, logger, Swagger, health)
3. ✅ Database schema (Prisma)
4. ✅ Auth (register/OTP/login/refresh/2FA)
5. ✅ Flutter mobile skeleton
6. ✅ Mobile auth screens
7. ✅ Home/Dashboard
8. ✅ AI Router (OpenAI + Gemini + Claude, fallback chain)
9. ✅ RAG pipeline (multi-source)
10. ✅ Legal Chat
11. ✅ Document Analyzer
12. ✅ Document Generator
13. ✅ Voice Assistant (Whisper STT + OpenAI TTS)
14. ✅ Subscription/Payment (Click/Payme)
15. ✅ Admin panel
16. ✅ Security hardening (helmet, CORS, throttle, audit)
17. 🟡 Tests (asosiy modullar qoplangan — qamrov kengaytirilmoqda)
18. 🟡 Docker/deployment (compose + nginx tayyor; CI: `.github/workflows/ci.yml`)

## Muhim xavfsizlik qoidasi

**Hech qanday AI provider yoki to'lov API kaliti mobil ilova yoki admin frontend kodida saqlanmaydi.** Barcha maxfiy kalitlar faqat backend `.env` faylida bo'ladi (`apps/api/.env`, `.env.example` dan nusxa olinadi). Mobil ilova va admin panel faqat backend REST API orqali ishlaydi.

## Backend ishga tushirish

```bash
cd apps/api
cp .env.example .env
npm install
npm run start:dev
```

Swagger docs: `http://localhost:4000/docs`
Health check: `http://localhost:4000/health`
