#!/usr/bin/env node
/**
 * Prisma does not allow env() in `datasource.provider`, but we want a single
 * schema file that runs on SQLite (dev) and PostgreSQL (prod). This stamps the
 * provider line from DATABASE_PROVIDER before any prisma command runs.
 *
 * Wired into the db:* and build npm scripts — you never call it by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "prisma", "schema.prisma");
const envPath = resolve(here, "..", ".env");

const ALLOWED = new Set(["sqlite", "postgresql"]);

function readEnvFile() {
  try {
    const out = {};
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const provider = process.env.DATABASE_PROVIDER ?? readEnvFile().DATABASE_PROVIDER ?? "sqlite";
if (!ALLOWED.has(provider)) {
  console.error(
    `[db-provider] DATABASE_PROVIDER="${provider}" is not supported. Use one of: ${[...ALLOWED].join(", ")}`,
  );
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]*"/,
  `$1"${provider}"`,
);
if (next !== schema) writeFileSync(schemaPath, next);
console.log(`[db-provider] datasource provider = ${provider}`);
