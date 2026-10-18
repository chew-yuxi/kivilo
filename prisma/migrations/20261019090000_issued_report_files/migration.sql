-- CreateTable
CREATE TABLE "IssuedReportFile" (
    "sha256" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedReportFile_pkey" PRIMARY KEY ("sha256")
);

-- CreateIndex
CREATE INDEX "IssuedReportFile_inspectionId_issuedAt_idx" ON "IssuedReportFile"("inspectionId", "issuedAt");

-- CreateIndex
CREATE INDEX "IssuedReportFile_storagePath_idx" ON "IssuedReportFile"("storagePath");

-- AddForeignKey
ALTER TABLE "IssuedReportFile" ADD CONSTRAINT "IssuedReportFile_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
