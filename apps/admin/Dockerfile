FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS development
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "-p", "3001"]

FROM deps AS builder
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
ENV PORT 3001
CMD ["node", "server.js"]
