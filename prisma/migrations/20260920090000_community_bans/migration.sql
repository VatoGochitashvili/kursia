-- A circle can remove a member; the row is what stops them rejoining.
CREATE TABLE IF NOT EXISTS "CommunityBan" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "removedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityBan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityBan_creatorId_userId_key" ON "CommunityBan"("creatorId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityBan_creatorId_createdAt_idx" ON "CommunityBan"("creatorId", "createdAt");

ALTER TABLE "CommunityBan" ADD CONSTRAINT "CommunityBan_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityBan" ADD CONSTRAINT "CommunityBan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
