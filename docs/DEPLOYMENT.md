# Adolat AI — Deploy qo'llanmasi (VPS + Docker + Play Market)

Bu qo'llanma backend (API), admin panel va mobil ilovani real serverga va
Play Market'ga chiqarishni bosqichma-bosqich tushuntiradi.

`<DOMEN>` — hamma joyda o'z domeningizga almashtiring (masalan: `adolat.uz`).

---

## 0. Talablar

- VPS (Ubuntu 22.04+), kamida 2 vCPU / 4GB RAM
- Docker + Docker Compose plugin o'rnatilgan
- Domen (masalan `adolat.uz`) va unga kirish (DNS)
- Gemini API kaliti (https://aistudio.google.com/apikey)

## 1. DNS

Domen provayderingizda quyidagi A-yozuvlarni VPS IP'ingizga yo'naltiring:

| Yozuv | Turi | Qiymat |
|-------|------|--------|
| `api.<DOMEN>`   | A | VPS_IP |
| `admin.<DOMEN>` | A | VPS_IP |
| `<DOMEN>`       | A | VPS_IP (ixtiyoriy) |

## 2. Kodni serverga olish

```bash
git clone <repo-url> adolat && cd adolat
```

## 3. Muhit (env) fayllari

```bash
# Backend
cp apps/api/.env.prod.example apps/api/.env.prod
# infra
cp infra/.env.prod.example infra/.env.prod
```

Ikkalasini ham tahrirlab to'ldiring. Eng muhimlari:

**`infra/.env.prod`**
- `POSTGRES_PASSWORD`, `REDIS_PASSWORD` — kuchli parollar
- `API_URL=https://api.<DOMEN>/api/v1`

**`apps/api/.env.prod`**
- `DATABASE_URL` — paroli `infra/.env.prod` dagi `POSTGRES_PASSWORD` bilan bir xil
- `REDIS_URL` — paroli `REDIS_PASSWORD` bilan bir xil
- `FRONTEND_URL=https://<DOMEN>`, `ADMIN_URL=https://admin.<DOMEN>`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — `openssl rand -hex 32`
- `GEMINI_API_KEY` — Gemini kalitingiz
- `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD` — admin panelga birinchi kirish
- To'lov (Click/Payme), SMTP — bo'lsa to'ldiring

> Maxfiy kalitli `.env.prod` fayllarni hech qachon git'ga qo'shmang.

## 4. TLS sertifikat (Let's Encrypt)

nginx `./nginx/ssl/fullchain.pem` va `privkey.pem` kutadi. Bir marta oling:

```bash
mkdir -p infra/certbot/www infra/nginx/ssl

# ACME challenge uchun avval faqat nginx'ni HTTP bilan ko'taring
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d nginx

# Sertifikat oling (har bir subdomen uchun)
docker run --rm \
  -v $(pwd)/infra/certbot/www:/var/www/certbot \
  -v $(pwd)/infra/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d api.<DOMEN> -d admin.<DOMEN> --email you@<DOMEN> --agree-tos --no-eff-email
```

So'ng olingan `fullchain.pem` / `privkey.pem` fayllarni `infra/nginx/ssl/` ga
joylang (yoki nginx.conf'dagi `ssl_certificate` yo'llarini certbot chiqargan
`live/...` yo'liga moslang). nginx.conf ichidagi `<DOMEN>` ni almashtiring.

## 5. Build va ishga tushirish

```bash
cd infra
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

- API konteyneri ishga tushganda **migratsiyalar avtomatik qo'llanadi**
  (`prisma migrate deploy`), pgvector kengaytmasi bilan.
- Postgres image allaqachon `pgvector/pgvector:pg16`.

## 6. Seed (birinchi marta)

Rollar, tariflar va admin foydalanuvchini yaratish:

```bash
docker compose -f docker-compose.prod.yml exec api npm run prisma:seed
```

## 7. Tekshirish

```bash
curl https://api.<DOMEN>/api/v1/health          # {"status":"ok",...}
```
- Admin panel: `https://admin.<DOMEN>` — `ADMIN_DEFAULT_EMAIL/PASSWORD` bilan kiring.
- Swagger: `https://api.<DOMEN>/api/docs`

## 8. Yangilash (redeploy)

```bash
git pull
cd infra
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 9. Mobil ilova — Play Market

### 9.1. Signing keystore (bir marta)

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias adolat-ai-upload
```

`apps/mobile/android/key.properties` yarating (`key.properties.example` dan):

```
storePassword=...
keyPassword=...
keyAlias=adolat-ai-upload
storeFile=/absolute/path/to/upload-keystore.jks
```

> `key.properties` va `.jks` ni git'ga qo'shmang.

### 9.2. App Bundle qurish

Production API manzilini `--dart-define` orqali bering:

```bash
cd apps/mobile
flutter pub get
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://api.<DOMEN>/api/v1
```

Natija: `build/app/outputs/bundle/release/app-release.aab`

### 9.3. Play Console

1. https://play.google.com/console — ilova yarating (`com.adolat.ai`).
2. `.aab` faylni **Production** (yoki avval Internal testing) ga yuklang.
3. Store listing, maxfiylik siyosati (`privacy_policy`), skrinshotlar, kontent
   reytingi va target auditoriyani to'ldiring.
4. Ko'rib chiqishga yuboring.

Har yangi versiyada `pubspec.yaml` dagi `version: 1.0.0+1` ni oshiring
(masalan `1.0.1+2`).

---

## Eslatmalar

- **Voice (ovozli yordamchi)** hozircha "tez kunda" — OpenAI (Whisper/TTS)
  talab qiladi. Keyin yoqish uchun: `apps/mobile` da `/voice` route'ini
  `VoiceScreen`ga qaytaring va backendga OpenAI kalitini bering.
- **RAG** faqat Gemini kaliti bilan ishlaydi (embeddings `text-embedding-004`,
  768 o'lchov). Huquqiy manbalarni admin paneldan qo'shib, sync qiling.
- **Backup**: `infra/scripts/backup.sh` va `restore.sh` mavjud.
