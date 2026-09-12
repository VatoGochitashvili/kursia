-- The points ledger behind each community's leaderboard.

CREATE TABLE IF NOT EXISTS "PointEvent" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id")
);

-- Idempotency: the same action can never be paid twice, and undoing one
-- (an unlike) has exactly one row to remove.
CREATE UNIQUE INDEX IF NOT EXISTS "PointEvent_creatorId_userId_sourceType_sourceId_key"
  ON "PointEvent"("creatorId", "userId", "sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "PointEvent_creatorId_createdAt_idx" ON "PointEvent"("creatorId", "createdAt");
CREATE INDEX IF NOT EXISTS "PointEvent_creatorId_userId_idx" ON "PointEvent"("creatorId", "userId");

ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
