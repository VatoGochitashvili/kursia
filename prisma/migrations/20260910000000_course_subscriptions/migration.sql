-- Monthly access as an alternative to buying a course outright.
--
-- Existing courses keep their behaviour exactly: pricingModel defaults to
-- ONE_TIME and accessExpiresAt stays NULL, which every entitlement check
-- reads as "never expires".

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "pricingModel" TEXT NOT NULL DEFAULT 'ONE_TIME';
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "subscriptionPriceMinor" INTEGER;

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "accessExpiresAt" TIMESTAMP(3);

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'ONE_TIME';
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GEL',
    "interval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "renewalNoticeSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_courseId_key" ON "Subscription"("userId", "courseId");
CREATE INDEX IF NOT EXISTS "Subscription_status_currentPeriodEnd_idx" ON "Subscription"("status", "currentPeriodEnd");
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_creatorId_status_idx" ON "Subscription"("creatorId", "status");
CREATE INDEX IF NOT EXISTS "Purchase_subscriptionId_idx" ON "Purchase"("subscriptionId");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
