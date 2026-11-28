ALTER TYPE "ItemCategory" ADD VALUE 'OTHER';
ALTER TYPE "ItemCondition" ADD VALUE 'MISSING';
ALTER TYPE "ItemCondition" ADD VALUE 'WORN';
ALTER TABLE "Inspection" ADD COLUMN "standaloneMoveOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "expectedWalkthroughPhotos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Inspection" ADD COLUMN "moveOutRequestHash" TEXT;
