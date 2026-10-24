CREATE TABLE "AgencyBranding" (
    "agencyId" TEXT NOT NULL,
    "agencyLicence" TEXT,
    "phone" TEXT,
    "logoPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyBranding_pkey" PRIMARY KEY ("agencyId")
);

ALTER TABLE "Inspection" ADD COLUMN "reportAgencyId" TEXT;

-- Sent reports already have their responsible agent frozen. Pin their current
-- operational team as well, so this migration cannot silently change an existing
-- report from team branding to personal branding.
UPDATE "Inspection" AS inspection
SET "reportAgencyId" = tenancy."agencyId"
FROM "Tenancy" AS tenancy
WHERE inspection."tenancyId" = tenancy."id"
  AND inspection."reportAgentFrozen" = true
  AND tenancy."agencyId" IS NOT NULL;

CREATE INDEX "Inspection_reportAgencyId_idx" ON "Inspection"("reportAgencyId");

ALTER TABLE "AgencyBranding"
ADD CONSTRAINT "AgencyBranding_agencyId_fkey"
FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Inspection"
ADD CONSTRAINT "Inspection_reportAgencyId_fkey"
FOREIGN KEY ("reportAgencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
