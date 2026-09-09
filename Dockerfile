# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# OpenSSL is required by the Prisma engine binaries (detection + runtime load)
RUN apk add --no-cache openssl

# Copy workspace manifests and lockfile only (cache layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json

# Install production deps only
RUN pnpm install --frozen-lockfile --prod --filter @scorra/api --filter @scorra/types

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# OpenSSL is required by the Prisma engine binaries (detection + runtime load)
RUN apk add --no-cache openssl

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json

# Install ALL deps (including devDependencies needed for tsc)
RUN pnpm install --frozen-lockfile --filter @scorra/api --filter @scorra/types

# Copy source
COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Generate the Prisma client BEFORE building: `pnpm install` runs before the
# schema is copied in, so without this the API would compile against the
# schema-less stub client (everything typed as `any`).
RUN cd apps/api && npx prisma generate

# Build shared types first, then the API
RUN pnpm --filter @scorra/types build
RUN pnpm --filter @scorra/api build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# OpenSSL is required by the Prisma engine binaries (detection + runtime load)
RUN apk add --no-cache openssl

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy prisma schema + migrations (needed for prisma generate at runtime)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy package manifests (needed by Node module resolution)
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/package.json ./package.json

# Generate Prisma client against the production binary
RUN cd apps/api && npx prisma generate

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && node dist/main"]
