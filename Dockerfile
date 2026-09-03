# ── builder ───────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm prisma generate

COPY . .
RUN pnpm build

# ── runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/prisma db seed && node build/index.js"]
