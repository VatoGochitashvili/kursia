#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Container startup.
#
# Applies migrations and ensures baseline data BEFORE the web server starts, so
# the app never serves traffic against a database with no tables. This is done
# here rather than in a "pre-deploy" hook because that is a paid feature on most
# hosts — the container should be able to bring itself up unaided.
#
# Both steps are idempotent, so a restart, a scale event or a redeploy is safe.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "▸ checking configuration"

if [ -z "$DATABASE_URL" ]; then
  echo "✖ DATABASE_URL is not set."
  echo "  Create a PostgreSQL database and set DATABASE_URL to its"
  echo "  *Internal* connection string, then redeploy."
  exit 1
fi

case "$DATABASE_URL" in
  *placeholder*|*"<paste"*|*"user:pass"*)
    echo "✖ DATABASE_URL is still a placeholder:"
    echo "    $DATABASE_URL"
    echo "  Replace it with your real PostgreSQL connection string."
    exit 1
    ;;
esac

echo "▸ applying database migrations"
# `migrate deploy` only ever applies pending migrations — it never resets or
# drops anything, which is why it is the correct command for production.
if ! node /app/migrator/node_modules/prisma/build/index.js migrate deploy \
     --schema=/app/prisma/schema.prisma; then
  echo "✖ migrations failed."
  echo "  Most common cause: DATABASE_URL points somewhere unreachable, or the"
  echo "  database rejected the connection. Check the URL and that the database"
  echo "  is in the same region as this service."
  exit 1
fi

echo "▸ ensuring platform settings, categories and the first admin"
# Never fatal: the app runs fine without the seed (settings fall back to their
# defaults), so a hiccup here must not keep the site down.
if node seed-production.mjs; then
  echo "▸ baseline data ready"
else
  echo "⚠ baseline seed did not complete — the site will still start."
  echo "  Categories or the admin account may be missing; re-deploy to retry."
fi

echo "▸ starting server on port ${PORT:-3000}"
exec node server.js
