-- Communities are browsable by topic, sharing the Category tree with courses.

ALTER TABLE "CreatorProfile" ADD COLUMN IF NOT EXISTS "communityCategoryId" TEXT;

ALTER TABLE "CreatorProfile" DROP CONSTRAINT IF EXISTS "CreatorProfile_communityCategoryId_fkey";
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_communityCategoryId_fkey"
  FOREIGN KEY ("communityCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The directory is a filtered, sorted read; these are the two shapes it takes.
CREATE INDEX IF NOT EXISTS "CreatorProfile_communityEnabled_communityMemberCount_idx"
  ON "CreatorProfile"("communityEnabled", "communityMemberCount");
CREATE INDEX IF NOT EXISTS "CreatorProfile_communityCategoryId_idx"
  ON "CreatorProfile"("communityCategoryId");
