import path from "node:path";
import { defineConfig } from "prisma/config";

// A Prisma config file disables Prisma's own .env loading, so do it ourselves.
// (Node >= 20.6 built-in; no dotenv dependency needed.)
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env is optional — real environments inject variables directly.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: { seed: "tsx prisma/seed.ts" },
});
