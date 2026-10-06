CREATE TABLE "LifetimeCouponRedemption" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "redeemedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifetimeCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifetimeCouponRedemption_codeHash_key"
  ON "LifetimeCouponRedemption"("codeHash");
CREATE UNIQUE INDEX "LifetimeCouponRedemption_clinicId_key"
  ON "LifetimeCouponRedemption"("clinicId");
CREATE INDEX "LifetimeCouponRedemption_redeemedById_createdAt_idx"
  ON "LifetimeCouponRedemption"("redeemedById", "createdAt");

ALTER TABLE "LifetimeCouponRedemption"
  ADD CONSTRAINT "LifetimeCouponRedemption_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LifetimeCouponRedemption"
  ADD CONSTRAINT "LifetimeCouponRedemption_redeemedById_fkey"
  FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
