-- What one person decided about mail, privacy and their account.
CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailMessages" BOOLEAN NOT NULL DEFAULT true,
    "emailCircle" BOOLEAN NOT NULL DEFAULT true,
    "emailEvents" BOOLEAN NOT NULL DEFAULT true,
    "emailPurchases" BOOLEAN NOT NULL DEFAULT true,
    "emailProduct" BOOLEAN NOT NULL DEFAULT false,
    "allowMessages" BOOLEAN NOT NULL DEFAULT true,
    "showMemberships" BOOLEAN NOT NULL DEFAULT true,
    "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId");

ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
