ALTER TABLE "Finding" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Finding_clientId_key" ON "Finding"("clientId");

CREATE TABLE "FindingPhotoDraft" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "findingId" TEXT,
  "savedAt" TIMESTAMP(3),
  "discardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FindingPhotoDraft_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FindingPhoto" (
  "clientId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "findingId" TEXT,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER,
  "note" TEXT,
  "annotations" JSONB,
  "registeredAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FindingPhoto_pkey" PRIMARY KEY ("clientId")
);
CREATE UNIQUE INDEX "FindingPhoto_storagePath_key" ON "FindingPhoto"("storagePath");
CREATE INDEX "FindingPhotoDraft_inspectionId_findingId_savedAt_discardedAt_idx" ON "FindingPhotoDraft"("inspectionId", "findingId", "savedAt", "discardedAt");
CREATE INDEX "FindingPhotoDraft_createdById_idx" ON "FindingPhotoDraft"("createdById");
CREATE INDEX "FindingPhoto_findingId_deletedAt_createdAt_idx" ON "FindingPhoto"("findingId", "deletedAt", "createdAt");
CREATE INDEX "FindingPhoto_draftId_deletedAt_idx" ON "FindingPhoto"("draftId", "deletedAt");
ALTER TABLE "FindingPhotoDraft" ADD CONSTRAINT "FindingPhotoDraft_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingPhotoDraft" ADD CONSTRAINT "FindingPhotoDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FindingPhotoDraft" ADD CONSTRAINT "FindingPhotoDraft_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FindingPhoto" ADD CONSTRAINT "FindingPhoto_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "FindingPhotoDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FindingPhoto" ADD CONSTRAINT "FindingPhoto_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
