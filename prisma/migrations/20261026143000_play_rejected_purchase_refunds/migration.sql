-- A new supported paid purchase rejected by workspace eligibility must be refunded.
-- Persist before the remote operation so RTDN/client redelivery retries safely.
ALTER TABLE "GooglePlayPurchase"
  ADD COLUMN "grantedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "refundReason" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3);
-- Existing entitlements are never candidates for automatic rejection/refund.
UPDATE "GooglePlayPurchase" AS p SET "grantedAt" = p."createdAt"
WHERE p."acknowledged" OR EXISTS (SELECT 1 FROM "Subscription" AS s WHERE s."googlePlayPurchaseId" = p."id");
