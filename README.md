# Kursia — Georgian online course marketplace

A production-shaped marketplace where creators publish and sell online courses
and students buy, learn and get certified. Georgian is the primary language;
English is a first-class second locale.

> **Renaming the platform:** the name appears nowhere as a literal. Change
> `PLATFORM_NAME` / `PLATFORM_NAME_KA` in `.env`, or edit them in
> **Admin → Settings** at runtime.

---

## Quick start

```bash
npm install
cp .env.example .env
# generate the three secrets the app needs
for k in AUTH_SECRET MEDIA_SIGNING_SECRET CERTIFICATE_SIGNING_SECRET PAYMENT_SANDBOX_SECRET; do
  printf '%s="%s"\n' "$k" "$(openssl rand -hex 32)"
done   # paste these into .env

npm run db:push          # create the schema (SQLite, no server needed)
npm run db:generate
node scripts/make-sample-media.mjs   # optional: real sample videos (needs ffmpeg)
npm run db:seed          # realistic Georgian marketplace data
npm run dev
```

Open <http://localhost:3000>.

### Seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@kursia.ge` | `Admin123!` |
| Creator | `giorgi.khutsishvili@example.ge` | `Creator123!` |
| Student | `mariam.kvaratskhelia@example.ge` | `Student123!` |

All seeded creators use `Creator123!`, all students `Student123!`.

---

## Stack and why

| Choice | Reason |
|---|---|
| **Next.js 15 (App Router)** | Public pages are server-rendered, so Google sees real course content — the single most important requirement for a marketplace. The same route handlers are a JSON API a native app can reuse. |
| **Prisma** | One schema, real foreign keys and indexes. Written *without* native enums, scalar lists or Json columns so the identical file runs on **SQLite** (dev, zero setup) and **PostgreSQL** (prod). |
| **Own auth layer** | `node:crypto` scrypt hashing + HMAC-signed httpOnly session cookies backed by a `Session` table, so sessions are revocable (logout-everywhere, suspension, password change) — something a stateless JWT cannot do. |
| **Tailwind + a token layer** | Components reference semantic names (`surface`, `ink`, `brand`), never raw hex, so the whole product can be re-themed from `tailwind.config.ts`. |
| **No chart/icon libraries** | The icon set and the two dashboard charts are hand-written SVG — a fraction of the bytes a library would cost on pages that are mostly data. |

---

## Architecture

```
Browser / future native app
        │
        ▼
Next.js route handlers  (/src/app/api/**)   ← one API, two clients
        │
        ├── auth        src/lib/auth/       scrypt, sessions, RBAC
        ├── payments    src/lib/payments/   provider interface + drivers
        ├── storage     src/lib/storage/    local disk | S3-compatible
        ├── video       src/lib/video/      own storage | Bunny Stream
        ├── email       src/lib/email/      outbox + log | Resend | SMTP
        └── db          Prisma → SQLite | PostgreSQL
```

Everything with an external dependency sits behind an interface with more than
one implementation, so a provider can be swapped without touching feature code.

### Directory map

| Path | What lives there |
|------|------------------|
| `src/app/(site)/` | Public, indexable pages — home, catalogue, course, creator, category, certificate |
| `src/app/(app)/` | Authenticated areas — student dashboard, creator studio, admin |
| `src/app/learn/` | The learning player (own layout: video owns the screen on mobile) |
| `src/app/api/` | The JSON API |
| `src/lib/` | Domain logic — no React imports |
| `src/i18n/` | Locale resolution + `ka`/`en` dictionaries (typed: a missing key is a build error) |
| `prisma/` | Schema + Georgian seed data |

---

## The rules this codebase actually enforces

These are the parts worth reviewing first, because they are where a course
marketplace usually goes wrong.

**Course access has exactly one source of truth.** The `Enrollment` table. It is
written for a paid course in exactly one function — `fulfillPurchase()` in
`src/lib/payments/fulfillment.ts` — and only from a webhook whose signature the
provider driver has verified, or an explicit admin action. Opening the checkout
page grants nothing. Landing on `/checkout/…/complete` grants nothing; that page
re-reads the purchase row and will say "processing" if the webhook has not
arrived.

**Prices are never taken from the client.** `startCheckout()` re-reads the price
and the commission from the database. Money is stored as integer minor units
(tetri) — never a float.

**Webhooks fail closed.** Every callback is persisted before it is trusted,
verified against the provider's signature, matched to a transaction, and checked
for an amount mismatch. `dedupeKey` makes reprocessing a no-op, because
providers retry. Rejected callbacks are auditable, not silently dropped.

**Paid media is never a plain URL.** Video is streamed through `/api/media` with
a short-lived HMAC grant bound to *one user id*; entitlement is re-checked
against the database on every byte range, so a refund cuts access on the next
request. Copying the URL into another browser gets a 403.

**Quizzes are graded on the server.** The payload sent to the student contains
question and answer *text* only — never which answer is correct.

**Uploads are allow-listed twice.** Extension *and* mime type, per kind, and the
stored key is a server-generated UUID, so a client filename never becomes a
path. SVG is never accepted.

Verified end-to-end during development:

```
forged webhook (bad signature) → 400, no enrolment created
signed webhook                 → PAID, enrolment created, ₾149 → ₾14.90 fee + ₾134.10 creator
webhook replayed               → idempotent, still one enrolment
media URL, other user's session→ 403
locked lesson, non-buyer       → 403 (free-preview lesson → 200)
progress POST for unowned course → 403
```

---

## Payments

Providers implement one interface (`src/lib/payments/types.ts`):

| Driver | `PAYMENT_PROVIDERS` | Status |
|---|---|---|
| Bank of Georgia | `bog` | Implemented — OAuth2 + RSA callback-signature verification. Add `BOG_*` credentials. |
| TBC Bank | `tbc` | Implemented — OAuth2 + HMAC callback verification. Add `TBC_*` credentials. |
| Bank transfer | `manual` | Buyer gets transfer instructions; an admin confirms receipt, which runs the same fulfilment path. |
| Sandbox | `sandbox` | Dev only. **Does not fake success** — it issues a real pending transaction that must be settled by a signed callback, exactly like a bank. Disabled in production. |

Bank endpoint paths follow each bank's published API; confirm them against the
contract you are issued before going live, since banks version these.

Adding a provider is one class plus one line in the registry — no checkout,
webhook or fulfilment changes.

## Creator earnings

`BalanceEntry` is an append-only ledger and the source of truth;
`CreatorBalance` is a materialised projection updated in the same transaction,
so every tetri traces to an event.

```
sale ₾100  →  platform fee ₾10 (configurable)  →  creator ₾90 → pending
                                                        ↓ after the clearing window
                                                   available → payout request
```

Money is not withdrawable immediately: a sale sits in `pendingMinor` for
`PAYOUT_CLEARING_DAYS` (the refund window) before clearing, which is what stops
a creator cashing out a sale that is later refunded. A payout request *reserves*
its amount inside a transaction, so two rapid requests cannot exceed the balance.

Commission is never hard-coded: platform default in Admin → Settings, with an
optional per-creator override. Changing it does not rewrite history — each
`Purchase` stores the rate that was actually applied.

---

## SEO

- Server-rendered public pages; the marketplace is **not** a client-only SPA.
- `/courses/[slug]`, `/creator/[slug]`, `/category/[slug]`, `/certificate/[id]`
- Per-page canonical + `hreflang` for both locales
- JSON-LD: `Course`, `Offer`, `Person`, `BreadcrumbList`, `FAQPage`, `ItemList`,
  `AggregateRating` — the rating is emitted **only when real reviews exist**
- Dynamic `sitemap.xml` with alternates; `robots.txt` blocks everything on
  non-production deployments so staging cannot outrank the live site
- Private areas are `noindex` at the header level, not just disallowed

## Localisation

Georgian lives at the root (`/courses/…`); English under `/en/…`, resolved by
middleware and passed down as a request header — one copy of every route file.
Dictionaries are typed against the Georgian one, so a missing English key fails
the build.

Nothing is formatted with `Intl` on a server-rendered path. Node ships full ICU
and browsers may not; for `ka-GE` they disagree (`₾89,10` vs `₾89.10`,
`05.08.2026` vs `08/05/2026`), and that is a genuine React hydration mismatch.
`src/lib/format.ts` formats by hand so every runtime produces the same string.

---

## Deploying

**Cloudflare Pages cannot host this app** — 47 Node-runtime route handlers,
Prisma's native query engine, `node:fs` media streaming and `scrypt` password
hashing all require a Node runtime that Workers do not provide. Run it on
Railway, Render, Fly.io, Cloud Run or a VPS; you can still front it with
Cloudflare for DNS/CDN and use R2 for media.

**Render is the shortest path**: `render.yaml` in the repo root is a Blueprint
that creates the web service, the PostgreSQL database and the maintenance cron
job in one step, and generates the three secrets itself. Dashboard → New →
Blueprint → pick this repo.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full guide. The short version:

```bash
DATABASE_PROVIDER=postgresql DATABASE_URL=postgresql://…
npm ci && npm run build     # build
npm run release             # migrate + seed settings/categories/admin
npm run start               # serve (reads PORT)
```

A `Dockerfile` is included (multi-stage, non-root, health-checked) for hosts
that want a container. Health probe: `GET /api/health`.

## Operations

Point a scheduler at `POST /api/cron` every ~10 minutes with
`Authorization: Bearer $AUTH_SECRET`. It drains the email outbox, clears matured
earnings and prunes expired sessions. Each job is idempotent.

### Moving to PostgreSQL

```bash
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@host:5432/kursia
npm run db:push
```

The schema file is stamped with the provider automatically
(`scripts/set-db-provider.mjs`); nothing else changes.

### Before going live

- [ ] Generate real values for the three secrets and `PAYMENT_SANDBOX_SECRET`
- [ ] `PAYMENT_SANDBOX_ENABLED=false`, remove `sandbox` from `PAYMENT_PROVIDERS`
- [ ] Add real BOG/TBC credentials and verify the callback signature scheme
- [ ] `STORAGE_DRIVER=s3` and `VIDEO_DRIVER=bunny` (self-hosted MP4 will not
      scale past a handful of concurrent viewers)
- [ ] `EMAIL_DRIVER=resend` (or implement SMTP) — the `log` driver only prints
- [ ] `TRUST_PROXY=true` behind a proxy you control, so rate limiting sees real IPs
- [ ] Point `setRateLimitStore()` at Redis if you run more than one instance
- [ ] Set the platform's real IBAN in Admin → Settings (checkout shows a
      placeholder until you do)
- [ ] Have the drafted Terms / Privacy / Refund pages reviewed by a lawyer

## Known gaps

Stated plainly rather than hidden:

- **SMTP driver is a stub.** `EMAIL_DRIVER=log` and `resend` work; `smtp` needs
  nodemailer wired into `SmtpEmailDriver.send()`.
- **Mux video driver is a stub.** `storage` and `bunny` work; Mux throws a clear
  error rather than silently serving nothing.
- **No native mobile app yet.** The API is structured for one (route handlers,
  JSON envelopes, no server-only session assumptions), and the responsive web
  app covers phones properly, but the React Native client is not built.
- **Search is `LIKE`-based.** Correct for Georgian (a unicameral script needs no
  case folding) and fine to ~10⁵ courses. `buildSearchFilter` in
  `src/lib/courses.ts` is the seam for Postgres full-text or Meilisearch.
- **Community features are foundations only** — follows, threaded comments and
  likes exist in the schema and API; there is no forum UI.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (honours `PORT`) |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Apply the schema |
| `npm run db:seed` | Seed Georgian marketplace data |
| `npm run db:reset` | Wipe, re-push, re-seed |
| `npm run db:studio` | Prisma Studio |
