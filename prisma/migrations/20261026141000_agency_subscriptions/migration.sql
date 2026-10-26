-- Operational team subscriptions are separate from legacy billing groups and personal
-- plans. Existing rows retain their target; no property or membership moves.
ALTER TABLE "Subscription" ADD COLUMN "agencyId" TEXT;
CREATE UNIQUE INDEX "Subscription_agencyId_key" ON "Subscription"("agencyId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_one_workspace";
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_one_workspace"
  CHECK (num_nonnulls("teamId", "stakeholderId", "agencyId") = 1);
