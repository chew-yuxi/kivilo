-- CreateEnum
CREATE TYPE "StatementAnswer" AS ENUM ('AGREED', 'DISPUTED');

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentVersionId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "answer" "StatementAnswer" NOT NULL,
    "reason" TEXT,
    "method" "AcknowledgementMethod" NOT NULL,
    "contentHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_assessmentVersionId_stakeholderId_key" ON "AssessmentResponse"("assessmentVersionId", "stakeholderId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_stakeholderId_idx" ON "AssessmentResponse"("stakeholderId");

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentVersionId_fkey" FOREIGN KEY ("assessmentVersionId") REFERENCES "AssessmentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
