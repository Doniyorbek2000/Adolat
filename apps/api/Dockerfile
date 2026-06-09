# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ---- Dependencies ----
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && cp -r node_modules prod_modules
RUN npm ci

# ---- Builder ----
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Development ----
FROM deps AS development
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ---- Production ----
FROM base AS production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/prod_modules ./node_modules
COPY package*.json ./
EXPOSE 4000
CMD ["node", "dist/main"]
