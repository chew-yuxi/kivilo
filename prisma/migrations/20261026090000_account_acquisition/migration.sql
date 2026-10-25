CREATE TABLE "AccountAcquisition" (
    "stakeholderId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "medium" TEXT,
    "campaign" TEXT,
    "landing" TEXT,
    "entryPoint" TEXT NOT NULL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "firstCompletedReportAt" TIMESTAMP(3),
    "firstPaidAt" TIMESTAMP(3),
    "firstPaidInvoiceId" TEXT,
    "firstPaidAmount" INTEGER,
    "firstPaidCurrency" TEXT,
    CONSTRAINT "AccountAcquisition_pkey" PRIMARY KEY ("stakeholderId")
);

CREATE UNIQUE INDEX "AccountAcquisition_firstPaidInvoiceId_key" ON "AccountAcquisition"("firstPaidInvoiceId");
CREATE INDEX "AccountAcquisition_verifiedAt_idx" ON "AccountAcquisition"("verifiedAt");
ALTER TABLE "AccountAcquisition" ADD CONSTRAINT "AccountAcquisition_stakeholderId_fkey"
  FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
