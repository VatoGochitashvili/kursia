-- Circles can require the owner's approval before somebody joins.

ALTER TABLE "CreatorProfile"
  ADD COLUMN IF NOT EXISTS "communityRequiresApproval" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "CommunityJoinRequest" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "CommunityJoinRequest_pkey" PRIMARY KEY ("id")
);

-- One standing request per person per circle; re-applying reuses the row.
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityJoinRequest_creatorId_userId_key"
  ON "CommunityJoinRequest"("creatorId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_creatorId_status_createdAt_idx"
  ON "CommunityJoinRequest"("creatorId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_userId_idx"
  ON "CommunityJoinRequest"("userId");

ALTER TABLE "CommunityJoinRequest" ADD CONSTRAINT "CommunityJoinRequest_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityJoinRequest" ADD CONSTRAINT "CommunityJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
