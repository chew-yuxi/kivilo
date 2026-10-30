CREATE TABLE "AppleBillingAccount" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "stakeholderId" TEXT,
  "retirementStartedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppleBillingAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppleBillingAccount_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AppleBillingAccount_workspaceKey_stakeholderId_key" ON "AppleBillingAccount"("workspaceKey", "stakeholderId");
CREATE INDEX "AppleBillingAccount_stakeholderId_idx" ON "AppleBillingAccount"("stakeholderId");
CREATE TABLE "ApplePurchase" (
  "id" TEXT NOT NULL,
  "originalTransactionId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "autoRenewing" BOOLEAN NOT NULL,
  "grantedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplePurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplePurchase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AppleBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApplePurchase_originalTransactionId_key" ON "ApplePurchase"("originalTransactionId");
CREATE INDEX "ApplePurchase_accountId_idx" ON "ApplePurchase"("accountId");
ALTER TABLE "Subscription" ADD COLUMN "applePurchaseId" TEXT;
CREATE UNIQUE INDEX "Subscription_applePurchaseId_key" ON "Subscription"("applePurchaseId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_applePurchaseId_fkey" FOREIGN KEY ("applePurchaseId") REFERENCES "ApplePurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppleBillingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplePurchase" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AppleBillingAccount", "ApplePurchase" FROM anon, authenticated, PUBLIC;
