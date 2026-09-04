import path from "node:path";

/**
 * Side-effect module: loads .env before any other import that reads
 * process.env. Imported first by the seed so `src/lib/env.ts` validates
 * against real values. (Node >= 20.6 built-in — no dotenv dependency.)
 */
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Environment already provided by the host.
}
