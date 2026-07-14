# Adolat Admin (Next.js) — monorepo-aware image.
# MUHIM: repo ILDIZIDAN quriladi (context = repo root):
#   docker build -f apps/admin/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.<domen>/api/v1 \
#     -t adolat-admin:latest .
# (docker-compose.prod.yml buni avtomatik qiladi.)

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- Build ----
FROM base AS build
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/admin/package.json ./apps/admin/
RUN npm ci
COPY apps/admin ./apps/admin
# NEXT_PUBLIC_* build vaqtida inline qilinadi — API manzili shu yerda beriladi.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=apps/admin

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/admin ./apps/admin
WORKDIR /app/apps/admin
EXPOSE 3001
# `next start` PORT muhit o'zgaruvchisini hurmat qiladi (3001).
CMD ["npm", "run", "start"]
