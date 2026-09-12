-- Discount codes.
--
-- Existing purchases are unaffected: discountMinor defaults to 0, which is
-- what every purchase made before coupons existed actually had taken off.

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "discountMinor" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "courseId" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX IF NOT EXISTS "Coupon_creatorId_isActive_idx" ON "Coupon"("creatorId", "isActive");
CREATE INDEX IF NOT EXISTS "Coupon_courseId_idx" ON "Coupon"("courseId");

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_purchaseId_key" ON "CouponRedemption"("purchaseId");
CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_userId_key" ON "CouponRedemption"("couponId", "userId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "couponId" TEXT;
CREATE INDEX IF NOT EXISTS "Purchase_couponId_idx" ON "Purchase"("couponId");
