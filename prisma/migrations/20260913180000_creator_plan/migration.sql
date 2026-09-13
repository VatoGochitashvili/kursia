-- Circles get an admin review state, and creators get a plan to pay for.

ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communitySubmittedAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityReviewedAt" TIMESTAMP(3);
ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityReviewNote" TEXT;

-- Circles that are already open were approved by the act of existing before
-- review was introduced. Marking them PENDING instead would pull every live
-- circle off the directory the moment this ships.
UPDATE "CreatorProfile" SET "communityStatus" = 'APPROVED'
  WHERE "communityEnabled" = true AND "communityStatus" = 'DRAFT';

CREATE INDEX IF NOT EXISTS "CreatorProfile_communityStatus_communitySubmittedAt_idx"
  ON "CreatorProfile"("communityStatus", "communitySubmittedAt");
