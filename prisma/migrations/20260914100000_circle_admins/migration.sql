-- Circle owners can appoint admins; joining needs approval by default.

-- Approval on by default for new circles, and switched on for existing ones:
-- the toggle only shipped a day earlier with a default of false that nobody
-- chose, and the product decision is that a circle is a closed room.
ALTER TABLE "CreatorProfile" ALTER COLUMN "communityRequiresApproval" SET DEFAULT true;
UPDATE "CreatorProfile" SET "communityRequiresApproval" = true;

CREATE TABLE IF NOT EXISTS "CommunityRole" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityRole_creatorId_userId_key"
  ON "CommunityRole"("creatorId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityRole_userId_idx" ON "CommunityRole"("userId");

ALTER TABLE "CommunityRole" ADD CONSTRAINT "CommunityRole_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityRole" ADD CONSTRAINT "CommunityRole_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
