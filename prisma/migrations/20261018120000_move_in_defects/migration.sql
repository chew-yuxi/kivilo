ALTER TABLE "Tenancy" ADD COLUMN "defectWindowDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_defectWindowDays_check"
  CHECK ("defectWindowDays" BETWEEN 0 AND 365);

ALTER TABLE "MaintenanceCase"
  ADD COLUMN "wasPresentAtMoveIn" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "moveInDefectInspectionId" TEXT;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_moveInDefectInspectionId_fkey"
  FOREIGN KEY ("moveInDefectInspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportAddendum"
  ADD COLUMN "sourceMaintenanceCaseId" TEXT,
  ADD COLUMN "disputedAt" TIMESTAMP(3),
  ADD COLUMN "disputedById" TEXT,
  ADD COLUMN "disputeReason" TEXT;
CREATE UNIQUE INDEX "ReportAddendum_sourceMaintenanceCaseId_key" ON "ReportAddendum"("sourceMaintenanceCaseId");
ALTER TABLE "ReportAddendum" ADD CONSTRAINT "ReportAddendum_sourceMaintenanceCaseId_fkey"
  FOREIGN KEY ("sourceMaintenanceCaseId") REFERENCES "MaintenanceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportAddendum" ADD CONSTRAINT "ReportAddendum_disputedById_fkey"
  FOREIGN KEY ("disputedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "ReportEmailKind" ADD VALUE 'TENANT_HANDOVER';
