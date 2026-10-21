-- New tenancies are private. Preserve access that already existed at this migration
-- as explicit grants, so changing a billing team later cannot silently share a deal.
ALTER TYPE "NotificationKind" ADD VALUE 'PROPERTY_SHARED';
ALTER TABLE "Notification" ADD COLUMN "tenancyId" TEXT;
CREATE INDEX "Notification_tenancyId_recipientId_idx" ON "Notification"("tenancyId", "recipientId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TenancyCollaborator" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenancyCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenancyCollaborator_tenancyId_stakeholderId_key" ON "TenancyCollaborator"("tenancyId", "stakeholderId");
CREATE INDEX "TenancyCollaborator_stakeholderId_idx" ON "TenancyCollaborator"("stakeholderId");

ALTER TABLE "TenancyCollaborator" ADD CONSTRAINT "TenancyCollaborator_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenancyCollaborator" ADD CONSTRAINT "TenancyCollaborator_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenancyCollaborator" ADD CONSTRAINT "TenancyCollaborator_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InspectionAccessGrant" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InspectionAccessGrant_inspectionId_stakeholderId_key" ON "InspectionAccessGrant"("inspectionId", "stakeholderId");
CREATE INDEX "InspectionAccessGrant_stakeholderId_idx" ON "InspectionAccessGrant"("stakeholderId");
ALTER TABLE "InspectionAccessGrant" ADD CONSTRAINT "InspectionAccessGrant_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionAccessGrant" ADD CONSTRAINT "InspectionAccessGrant_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TenancyCollaborator" ("id", "tenancyId", "stakeholderId")
SELECT 'tc_' || md5(tenancy."id" || ':' || teammate."id"), tenancy."id", teammate."id"
FROM "Tenancy" tenancy
JOIN "Stakeholder" lead ON lead."id" = tenancy."agentId"
JOIN "Stakeholder" teammate ON teammate."teamId" = lead."teamId"
WHERE teammate."id" <> tenancy."agentId"
ON CONFLICT ("tenancyId", "stakeholderId") DO NOTHING;

-- Conducting one inspection never granted sibling inspections or repairs. Preserve
-- only that exact scope, including historical tenancies without a remaining lead.
INSERT INTO "InspectionAccessGrant" ("id", "inspectionId", "stakeholderId")
SELECT 'ig_' || md5(inspection."id" || ':' || inspection."conductedById"),
       inspection."id", inspection."conductedById"
FROM "Inspection" inspection
JOIN "Tenancy" tenancy ON tenancy."id" = inspection."tenancyId"
WHERE inspection."conductedById" IS NOT NULL
  AND inspection."conductedById" IS DISTINCT FROM tenancy."agentId"
  AND NOT EXISTS (
      SELECT 1 FROM "TenancyCollaborator" collaborator
      WHERE collaborator."tenancyId" = tenancy."id"
        AND collaborator."stakeholderId" = inspection."conductedById"
  )
ON CONFLICT ("inspectionId", "stakeholderId") DO NOTHING;

-- Scope existing outbox and inbox rows too, so removing access also suppresses
-- messages queued before this migration. Generic account messages remain unscoped.
UPDATE "Notification" notification SET "tenancyId" = repair."tenancyId"
FROM "MaintenanceCase" repair
WHERE notification."href" = '/maintenance/' || repair."id";

UPDATE "Notification" notification SET "tenancyId" = inspection."tenancyId"
FROM "ReportAddendum" addendum
JOIN "Inspection" inspection ON inspection."id" = addendum."inspectionId"
WHERE notification."href" = '/updates/' || addendum."id";

UPDATE "Notification" notification SET "tenancyId" = inspection."tenancyId"
FROM "Inspection" inspection
WHERE notification."href" = '/sign/' || inspection."id";

UPDATE "Notification" notification SET "tenancyId" = tenancy."id"
FROM "Tenancy" tenancy
WHERE notification."kind" = 'RENEWAL_DUE'
  AND notification."dedupeKey" LIKE 'renewal:' || tenancy."id" || ':%';
