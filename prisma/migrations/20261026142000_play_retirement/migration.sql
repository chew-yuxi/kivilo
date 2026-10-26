-- Freeze reconciliation while account deletion retries remote cancellation.
ALTER TABLE "GooglePlayBillingAccount" ADD COLUMN "retirementStartedAt" TIMESTAMP(3);
