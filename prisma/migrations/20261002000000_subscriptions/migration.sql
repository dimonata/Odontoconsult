CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAUSED', 'CANCELLED');

CREATE TABLE "BillingPlan" (
  "id" TEXT NOT NULL,
  "providerPlanId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
  "providerPlanId" TEXT,
  "providerSubscriptionId" TEXT,
  "providerStatus" TEXT,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "payerEmail" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "checkoutUrl" TEXT,
  "trialEndsAt" TIMESTAMPTZ(3),
  "nextPaymentAt" TIMESTAMPTZ(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_providerPlanId_key" ON "BillingPlan"("providerPlanId");
CREATE UNIQUE INDEX "Subscription_clinicId_key" ON "Subscription"("clinicId");
CREATE UNIQUE INDEX "Subscription_providerSubscriptionId_key" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_status_updatedAt_idx" ON "Subscription"("status", "updatedAt");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
