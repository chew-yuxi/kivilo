ALTER TABLE "AccountDeletionRequest" ADD COLUMN "processingPolicyVersion" TEXT;

CREATE TABLE "AccountDeletionStoragePurge" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "readyAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AccountDeletionStoragePurge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDeletionStoragePurge_roomId_key"
  ON "AccountDeletionStoragePurge"("roomId");
CREATE INDEX "AccountDeletionStoragePurge_requestId_completedAt_idx"
  ON "AccountDeletionStoragePurge"("requestId", "completedAt");
ALTER TABLE "AccountDeletionStoragePurge" ADD CONSTRAINT "AccountDeletionStoragePurge_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "AccountDeletionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
