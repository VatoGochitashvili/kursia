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

# Render (and similar hosts) can mount a "Secret File" — typically a .env —
# into the app root and /etc/secrets. Load it into the environment so this
# script and the app see the same values as a plain env-var setup. Parsed line
# by line rather than sourced: the file must never be able to execute code.
for candidate in /etc/secrets/.env ./.env; do
  [ -f "$candidate" ] || continue
  echo "▸ loading configuration from $candidate"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in "" | \#*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac

    key=${line%%=*}
    value=${line#*=}

    # Ignore anything that is not a plain variable name.
    case "$key" in *[!A-Za-z0-9_]* | "") continue ;; esac

    # Strip one layer of surrounding quotes, if present.
    case "$value" in
      \"*\") value=${value#\"}; value=${value%\"} ;;
      "'"*"'") value=${value#"'"}; value=${value%"'"} ;;
    esac

    # A variable set directly on the service always wins over the file.
    eval "current=\${$key-}"
    [ -n "$current" ] || export "$key=$value"
  done < "$candidate"
done

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

# Signing secrets gate sessions, media grants and certificates. Without them
# the app would fall back to a constant dev value, so anyone could forge a
# session cookie. Refuse to start rather than run insecurely.
missing=""
for var in AUTH_SECRET MEDIA_SIGNING_SECRET CERTIFICATE_SIGNING_SECRET; do
  eval "value=\$$var"
  case "$value" in
    "" | replace-me*) missing="$missing $var" ;;
  esac
done

if [ -n "$missing" ]; then
  echo "✖ missing or placeholder secrets:$missing"
  echo "  Generate one value per variable and set them on the service:"
  echo "    openssl rand -hex 32"
  echo "  (On Render these can be auto-generated — see render.yaml.)"
  exit 1
fi

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

# Optional showcase catalogue, driven entirely by one variable so it can be
# managed from a host dashboard without shell access:
#   SEED_DEMO_DATA=true    add fabricated instructors, courses and reviews
#   SEED_DEMO_DATA=remove  delete them again
# Adding is a no-op if already present, so redeploys do not duplicate it.
if [ -n "$SEED_DEMO_DATA" ]; then
  echo "▸ demo content: $SEED_DEMO_DATA"
  node seed-demo.mjs || echo "⚠ demo seed did not complete — the site will still start."
fi

echo "▸ starting server on port ${PORT:-3000}"
exec node server.js
