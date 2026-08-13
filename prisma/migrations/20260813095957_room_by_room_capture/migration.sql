/*
  Warnings:

  - You are about to drop the column `inspectionId` on the `Capture` table. All the data in the column will be lost.
  - You are about to drop the `ItemMedia` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roomId` to the `Capture` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CaptureKind" AS ENUM ('VIDEO', 'PHOTO');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('PENDING', 'CAPTURING', 'PROCESSING', 'REVIEW', 'REVIEWED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Capture" DROP CONSTRAINT "Capture_inspectionId_fkey";

-- DropForeignKey
ALTER TABLE "ItemMedia" DROP CONSTRAINT "ItemMedia_itemId_fkey";

-- DropIndex
DROP INDEX "Capture_inspectionId_idx";

-- AlterTable
ALTER TABLE "Capture" DROP COLUMN "inspectionId",
ADD COLUMN     "kind" "CaptureKind" NOT NULL DEFAULT 'VIDEO',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "roomId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InspectionItem" ADD COLUMN     "identifier" TEXT,
ADD COLUMN     "sourceCaptureId" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "status" "RoomStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "ItemMedia";

-- DropEnum
DROP TYPE "MediaKind";

-- CreateIndex
CREATE INDEX "Capture_roomId_idx" ON "Capture"("roomId");

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_sourceCaptureId_fkey" FOREIGN KEY ("sourceCaptureId") REFERENCES "Capture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
