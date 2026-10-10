ALTER TABLE "Inspection"
  ADD COLUMN "aiConsentAt" TIMESTAMP(3),
  ADD COLUMN "aiConsentById" TEXT;

ALTER TABLE "Capture" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Capture_clientId_key" ON "Capture"("clientId");

ALTER TABLE "Room"
  ADD COLUMN "processingAttemptId" TEXT,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3);

CREATE TABLE "AssessmentVersion" (
  "id" TEXT NOT NULL,
  "inspectionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedById" TEXT NOT NULL,
  CONSTRAINT "AssessmentVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentVersion_inspectionId_version_key"
  ON "AssessmentVersion"("inspectionId", "version");
CREATE INDEX "AssessmentVersion_inspectionId_publishedAt_idx"
  ON "AssessmentVersion"("inspectionId", "publishedAt");
ALTER TABLE "AssessmentVersion" ADD CONSTRAINT "AssessmentVersion_inspectionId_fkey"
  FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "DeletionRequestStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED');
CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "stakeholderId" TEXT NOT NULL,
  "status" "DeletionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "notificationSentAt" TIMESTAMP(3),
  "fulfilledUnderPolicy" TEXT,
  "email" TEXT,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccountDeletionRequest_status_dueAt_idx"
  ON "AccountDeletionRequest"("status", "dueAt");
CREATE UNIQUE INDEX "AccountDeletionRequest_stakeholderId_key"
  ON "AccountDeletionRequest"("stakeholderId");
CREATE INDEX "AccountDeletionRequest_stakeholderId_requestedAt_idx"
  ON "AccountDeletionRequest"("stakeholderId", "requestedAt");
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_stakeholderId_fkey"
  FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
