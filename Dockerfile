# ---------- 1️⃣ Dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- 2️⃣ Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NODE_ENV=production
RUN npm run build

# ---------- 3️⃣ Runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy full node_modules for external packages (pg, prisma) that standalone doesn't trace
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib/generated ./lib/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]