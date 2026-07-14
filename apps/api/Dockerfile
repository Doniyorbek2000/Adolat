# Adolat API — monorepo-aware image.
# MUHIM: repo ILDIZIDAN quriladi (context = repo root):
#   docker build -f apps/api/Dockerfile -t adolat-api:latest .
# (docker-compose.prod.yml buni avtomatik qiladi.)

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Build ----
FROM base AS build
# Manifestlar + shared to'liq (shared'ning prepare skripti manba talab qiladi)
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/api/package.json ./apps/api/
RUN npm ci
RUN npm run build --workspace=packages/shared
# Manba kodi
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 4000
# Migratsiyalarni qo'llab, so'ng serverni ishga tushiramiz.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
