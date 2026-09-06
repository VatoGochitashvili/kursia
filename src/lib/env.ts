import { z } from "zod";

/**
 * Single, validated entry point for configuration. Nothing else in the app
 * reads process.env directly, so a missing/typo'd variable fails loudly at
 * boot instead of silently at runtime.
 */

const bool = (dflt: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? dflt : v === "true" || v === "1"));

const int = (dflt: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? dflt : Number(v)))
    .pipe(z.number().int());

const csv = (dflt: string) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v && v.trim() !== "" ? v : dflt)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

const DEV = process.env.NODE_ENV !== "production";

/**
 * `next build` runs with NODE_ENV=production, but a container image is built
 * once and its secrets are injected when it RUNS. Demanding them at build time
 * would mean baking production credentials into the image — exactly backwards,
 * and it makes the image impossible to build in CI.
 *
 * So the check is skipped during the build and enforced when the server
 * actually starts, which is the moment that matters: a deployment missing
 * AUTH_SECRET still refuses to boot.
 */
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
const ENFORCE_SECRETS = !DEV && !IS_BUILD;

/** Secrets must be real in production; dev gets a deterministic stand-in. */
const secret = (name: string) =>
  z
    .string()
    .optional()
    .transform((v) => v ?? "")
    .superRefine((v, ctx) => {
      if (ENFORCE_SECRETS && (v.length < 32 || v.startsWith("replace-me"))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} must be set to a random value of at least 32 chars in production (openssl rand -hex 32)`,
        });
      }
    })
    .transform((v) => (v.length >= 16 ? v : `dev-insecure-${name}-do-not-use-in-production`));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PLATFORM_NAME: z.string().min(1).default("Kursia"),
  PLATFORM_NAME_KA: z.string().min(1).default("კურსია"),
  PLATFORM_TAGLINE_KA: z.string().default("ისწავლე. შექმენი. გამოიმუშავე."),
  PLATFORM_SUPPORT_EMAIL: z.string().email().default("info@kursia.ge"),

  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
  DATABASE_URL: z.string().min(1),

  AUTH_SECRET: secret("AUTH_SECRET"),
  MEDIA_SIGNING_SECRET: secret("MEDIA_SIGNING_SECRET"),
  CERTIFICATE_SIGNING_SECRET: secret("CERTIFICATE_SIGNING_SECRET"),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_ROOT: z.string().default("./storage"),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_BASE_URL: z.string().default(""),

  VIDEO_DRIVER: z.enum(["storage", "bunny", "mux"]).default("storage"),
  BUNNY_STREAM_LIBRARY_ID: z.string().default(""),
  BUNNY_STREAM_API_KEY: z.string().default(""),
  BUNNY_STREAM_CDN_HOSTNAME: z.string().default(""),
  BUNNY_TOKEN_AUTH_KEY: z.string().default(""),
  MUX_TOKEN_ID: z.string().default(""),
  MUX_TOKEN_SECRET: z.string().default(""),
  MUX_SIGNING_KEY_ID: z.string().default(""),
  MUX_SIGNING_PRIVATE_KEY: z.string().default(""),

  PAYMENT_PROVIDERS: csv("sandbox,manual"),
  PAYMENT_DEFAULT_PROVIDER: z.string().default("sandbox"),
  PAYMENT_SANDBOX_ENABLED: bool(true),
  PAYMENT_SANDBOX_SECRET: secret("PAYMENT_SANDBOX_SECRET"),

  BOG_CLIENT_ID: z.string().default(""),
  BOG_CLIENT_SECRET: z.string().default(""),
  BOG_API_BASE: z.string().default("https://api.bog.ge"),
  BOG_PUBLIC_KEY: z.string().default(""),

  TBC_API_KEY: z.string().default(""),
  TBC_CLIENT_ID: z.string().default(""),
  TBC_CLIENT_SECRET: z.string().default(""),
  TBC_API_BASE: z.string().default("https://api.tbcbank.ge"),
  TBC_WEBHOOK_SECRET: z.string().default(""),

  DEFAULT_CURRENCY: z.string().default("GEL"),
  DEFAULT_COMMISSION_BPS: int(1000),
  PAYOUT_CLEARING_DAYS: int(14),
  PAYOUT_MINIMUM_MINOR: int(5000),
  REFUND_WINDOW_DAYS: int(14),

  EMAIL_DRIVER: z.enum(["log", "smtp", "resend"]).default("log"),
  EMAIL_FROM: z.string().default("Kursia <no-reply@kursia.ge>"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: int(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  RESEND_API_KEY: z.string().default(""),

  SESSION_TTL_DAYS: int(30),
  RATE_LIMIT_ENABLED: bool(true),
  TRUST_PROXY: bool(false),

  SEED_ADMIN_EMAIL: z.string().default("admin@kursia.ge"),
  SEED_ADMIN_PASSWORD: z.string().default("Admin123!"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${detail}\n\nSee .env.example.`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isDev = !isProd;
