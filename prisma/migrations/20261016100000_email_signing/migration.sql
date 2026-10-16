-- AlterTable
ALTER TABLE "Signature" ADD COLUMN "contentHash" TEXT;

-- CreateEnum
CREATE TYPE "ReportEmailKind" AS ENUM ('SIGNATURE_REQUEST', 'SIGNED_COPY');

-- CreateTable
CREATE TABLE "ReportEmail" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" "ReportEmailKind" NOT NULL,
    "dedupeKey" TEXT,
    "emailTo" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "retryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportEmail_dedupeKey_key" ON "ReportEmail"("dedupeKey");

-- CreateIndex
CREATE INDEX "ReportEmail_sentAt_attempts_retryAt_idx" ON "ReportEmail"("sentAt", "attempts", "retryAt");

-- CreateIndex
CREATE INDEX "ReportEmail_inspectionId_recipientId_idx" ON "ReportEmail"("inspectionId", "recipientId");

-- AddForeignKey
ALTER TABLE "ReportEmail" ADD CONSTRAINT "ReportEmail_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEmail" ADD CONSTRAINT "ReportEmail_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
