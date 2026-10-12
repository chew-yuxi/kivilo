-- AlterTable
ALTER TABLE "Capture" ADD COLUMN "posterPath" TEXT,
ADD COLUMN "posterAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Capture_posterPath_key" ON "Capture"("posterPath");
