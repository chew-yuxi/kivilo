CREATE TYPE "RenewalDecision" AS ENUM ('NOT_RENEWING', 'DISMISSED');
ALTER TYPE "NotificationKind" ADD VALUE 'RENEWAL_DUE';

ALTER TABLE "Tenancy"
  ADD COLUMN "renewalDecision" "RenewalDecision",
  ADD COLUMN "renewalSnoozedUntil" TIMESTAMP(3),
  ADD COLUMN "renewedFromId" TEXT;

CREATE UNIQUE INDEX "Tenancy_renewedFromId_key" ON "Tenancy"("renewedFromId");
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_renewedFromId_fkey"
  FOREIGN KEY ("renewedFromId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
