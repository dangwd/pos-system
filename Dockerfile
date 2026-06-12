# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────────────────────
# Frontend POS (Next.js 16 · App Router · output: standalone)
# Build:  docker build -t pos-system .
# Run:    docker run -p 3000:3000 pos-system
# ──────────────────────────────────────────────────────────────────────────────

# node:24 bundles npm 11 — KHỚP với npm đã tạo package-lock.json (npm 11.x).
# Dùng node:22 (npm 10) sẽ làm `npm ci` báo lockfile out-of-sync.
FROM node:24-alpine AS base

# ── 1. Cài dependencies (cache theo lockfile) ────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. Build ─────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_BASE_URL được nướng vào lúc build (Next bake rewrites + biến
# NEXT_PUBLIC vào bundle). Đổi backend ⇒ phải build lại.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── 3. Runner (image production tối thiểu) ───────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output: server.js + node_modules tối thiểu + static + public.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
