CREATE UNIQUE INDEX "Capture_storagePath_key" ON "Capture"("storagePath");

CREATE TABLE "StoragePurge" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "isPrefix" BOOLEAN NOT NULL,
  "readyAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoragePurge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StoragePurge_path_key" ON "StoragePurge"("path");
CREATE INDEX "StoragePurge_completedAt_readyAt_idx"
  ON "StoragePurge"("completedAt", "readyAt");
