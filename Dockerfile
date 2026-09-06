# ─────────────────────────────────────────────────────────────────────────────
# Kursia — production image.
#
# Runs on any Node host: Railway, Render, Fly.io, a VPS, Google Cloud Run.
# Multi-stage so the final image carries no build toolchain and no source.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
# Prisma's query engine needs both on Alpine: libc6-compat for glibc symbols
# and openssl for the TLS it uses to reach Postgres. Missing openssl is the
# classic "Prisma works locally, dies in Alpine" failure.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The datasource provider is stamped from this at build time, and the Prisma
# client is generated for the same target the runtime will use.
ENV DATABASE_PROVIDER=postgresql
# A placeholder is enough to generate the client; the real URL is injected at
# run time. Nothing connects to a database during the build.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# Emit .next/standalone — a self-contained server with only the files it needs.
ENV BUILD_STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Bundle the production seed to plain JS so the runtime image needs no tsx or
# TypeScript toolchain. Prisma stays external — it is already in the image.
RUN npx esbuild prisma/seed-production.ts \
      --bundle --platform=node --format=esm --target=node22 \
      --tsconfig=tsconfig.json \
      --external:@prisma/client --external:prisma \
      --outfile=/app/seed-production.mjs

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Never run the app as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema + migrations, so `migrate deploy` can run on boot.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# The Prisma CLI, installed into its OWN tree. Copying the CLI out of the build
# stage does not work — it pulls dependencies (`effect`, others) that the
# standalone output prunes, so it fails at runtime with "Cannot find module".
# Isolating it also keeps it from colliding with the standalone server's
# dependency tree. The version is read from the lockfile so it cannot drift.
COPY --from=builder /app/package-lock.json ./package-lock.json
RUN PRISMA_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version") \
 && npm install --no-save --no-audit --no-fund --prefix /app/migrator "prisma@$PRISMA_VERSION" \
 && npm cache clean --force \
 && rm -f ./package-lock.json \
 && chown -R nextjs:nodejs /app/migrator

# Migrations + baseline data run on boot, so no paid "pre-deploy" hook is
# needed: the container brings itself up unaided on any plan.
COPY --from=builder --chown=nextjs:nodejs /app/seed-production.mjs ./seed-production.mjs
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Local-disk storage is a dev convenience; in production set STORAGE_DRIVER=s3.
# The directory exists so a misconfigured deploy fails loudly rather than
# silently writing into a read-only path.
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]
