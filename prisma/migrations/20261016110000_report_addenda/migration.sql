-- CreateEnum
CREATE TYPE "AddendumChange" AS ENUM ('ADDED', 'REPLACED', 'REMOVED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'REPORT_UPDATED';

-- CreateTable
CREATE TABLE "ReportAddendum" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "number" INTEGER,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "snapshot" JSONB,
    "contentHash" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "ReportAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAddendumEntry" (
    "id" TEXT NOT NULL,
    "addendumId" TEXT NOT NULL,
    "change" "AddendumChange" NOT NULL,
    "roomName" TEXT NOT NULL,
    "targetKey" TEXT,
    "name" TEXT,
    "category" "ItemCategory",
    "condition" "ItemCondition",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "identifier" TEXT,
    "notes" TEXT,
    "maintenanceCaseId" TEXT,
    "propertyAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAddendumEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAddendumPhoto" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "note" TEXT,
    "label" TEXT,
    "maintenanceEvidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAddendumPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddendumAcknowledgement" (
    "id" TEXT NOT NULL,
    "addendumId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "AddendumAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportAddendum_inspectionId_createdAt_idx" ON "ReportAddendum"("inspectionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAddendum_inspectionId_number_key" ON "ReportAddendum"("inspectionId", "number");

-- CreateIndex
CREATE INDEX "ReportAddendumEntry_addendumId_createdAt_idx" ON "ReportAddendumEntry"("addendumId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportAddendumPhoto_entryId_createdAt_idx" ON "ReportAddendumPhoto"("entryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AddendumAcknowledgement_addendumId_stakeholderId_key" ON "AddendumAcknowledgement"("addendumId", "stakeholderId");

-- AddForeignKey
ALTER TABLE "ReportAddendum" ADD CONSTRAINT "ReportAddendum_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendum" ADD CONSTRAINT "ReportAddendum_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendum" ADD CONSTRAINT "ReportAddendum_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendumEntry" ADD CONSTRAINT "ReportAddendumEntry_addendumId_fkey" FOREIGN KEY ("addendumId") REFERENCES "ReportAddendum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendumEntry" ADD CONSTRAINT "ReportAddendumEntry_maintenanceCaseId_fkey" FOREIGN KEY ("maintenanceCaseId") REFERENCES "MaintenanceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendumEntry" ADD CONSTRAINT "ReportAddendumEntry_propertyAssetId_fkey" FOREIGN KEY ("propertyAssetId") REFERENCES "PropertyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAddendumPhoto" ADD CONSTRAINT "ReportAddendumPhoto_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ReportAddendumEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddendumAcknowledgement" ADD CONSTRAINT "AddendumAcknowledgement_addendumId_fkey" FOREIGN KEY ("addendumId") REFERENCES "ReportAddendum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddendumAcknowledgement" ADD CONSTRAINT "AddendumAcknowledgement_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

