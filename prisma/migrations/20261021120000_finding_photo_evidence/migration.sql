ALTER TABLE "MaintenanceEvidence" ADD COLUMN "annotations" JSONB;
ALTER TABLE "ReportAddendumPhoto" ADD COLUMN "annotations" JSONB;
ALTER TABLE "Finding" ADD COLUMN "clientId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "uploadPaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX "Finding_clientId_key" ON "Finding"("clientId");

CREATE TABLE "FindingPhoto" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "note" TEXT,
    "annotations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FindingPhoto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FindingPhoto_clientId_key" ON "FindingPhoto"("clientId");
CREATE UNIQUE INDEX "FindingPhoto_storagePath_key" ON "FindingPhoto"("storagePath");
CREATE INDEX "FindingPhoto_findingId_createdAt_idx" ON "FindingPhoto"("findingId", "createdAt");
ALTER TABLE "FindingPhoto" ADD CONSTRAINT "FindingPhoto_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
