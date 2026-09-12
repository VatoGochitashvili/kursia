-- The community becomes something you can sell a month of.

-- ── The community as a product ─────────────────────────────────────────────
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityName" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityTagline" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityDescription" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityCoverUrl" TEXT;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityPriceMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityCurrency" TEXT NOT NULL DEFAULT 'GEL';
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityMemberCount" INTEGER NOT NULL DEFAULT 0;

-- Courses are in the membership unless the creator takes them out.
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "includedInMembership" BOOLEAN NOT NULL DEFAULT true;

-- ── Subscriptions may now be for a community rather than a course ─────────
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'COURSE';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "scopeKey" TEXT;

-- Backfill before the column is made NOT NULL: every existing row is a course
-- subscription, so its scope is that course.
UPDATE "Subscription" SET "scopeKey" = 'course:' || "courseId" WHERE "scopeKey" IS NULL;
ALTER TABLE "Subscription" ALTER COLUMN "scopeKey" SET NOT NULL;

-- courseId is null for a community subscription.
ALTER TABLE "Subscription" ALTER COLUMN "courseId" DROP NOT NULL;

-- The old key cannot express a community row (courseId is null, and SQL treats
-- NULLs as distinct, which would allow duplicates). scopeKey is explicit.
DROP INDEX IF EXISTS "Subscription_userId_courseId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_scopeKey_key"
  ON "Subscription"("userId", "scopeKey");

-- ── A membership month is a Purchase with no course ──────────────────────
ALTER TABLE "Purchase" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "courseId" DROP NOT NULL;
