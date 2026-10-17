-- AlterTable
ALTER TABLE "InspectionItem" ADD COLUMN "baselineKey" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "baseline" JSONB;
