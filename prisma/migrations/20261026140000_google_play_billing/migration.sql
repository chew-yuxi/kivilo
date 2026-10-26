CREATE TABLE "GooglePlayBillingAccount" (
  "id" TEXT NOT NULL,
  "workspaceKey" TEXT NOT NULL,
  "stakeholderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GooglePlayBillingAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GooglePlayPurchase" (
  "id" TEXT NOT NULL,
  "purchaseToken" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "basePlanId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "autoRenewing" BOOLEAN NOT NULL,
  "acknowledged" BOOLEAN NOT NULL,
  "testPurchase" BOOLEAN NOT NULL,
  "replacedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GooglePlayPurchase_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Subscription" ADD COLUMN "googlePlayPurchaseId" TEXT;
CREATE UNIQUE INDEX "GooglePlayPurchase_purchaseToken_key" ON "GooglePlayPurchase"("purchaseToken");
CREATE UNIQUE INDEX "Subscription_googlePlayPurchaseId_key" ON "Subscription"("googlePlayPurchaseId");
CREATE INDEX "GooglePlayBillingAccount_stakeholderId_idx" ON "GooglePlayBillingAccount"("stakeholderId");
CREATE INDEX "GooglePlayBillingAccount_workspaceKey_idx" ON "GooglePlayBillingAccount"("workspaceKey");
CREATE INDEX "GooglePlayPurchase_accountId_idx" ON "GooglePlayPurchase"("accountId");
ALTER TABLE "GooglePlayBillingAccount" ADD CONSTRAINT "GooglePlayBillingAccount_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GooglePlayPurchase" ADD CONSTRAINT "GooglePlayPurchase_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GooglePlayBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_googlePlayPurchaseId_fkey" FOREIGN KEY ("googlePlayPurchaseId") REFERENCES "GooglePlayPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_payment_provider_check" CHECK ("stripeSubscriptionId" IS NULL OR "googlePlayPurchaseId" IS NULL);
ALTER TABLE public."GooglePlayBillingAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GooglePlayPurchase" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."GooglePlayBillingAccount", public."GooglePlayPurchase" FROM anon, authenticated, PUBLIC;
