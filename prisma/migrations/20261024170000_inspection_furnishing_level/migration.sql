CREATE TYPE "FurnishingLevel" AS ENUM (
  'FULLY_FURNISHED',
  'PARTIALLY_FURNISHED',
  'UNFURNISHED'
);

ALTER TABLE "Inspection"
ADD COLUMN "furnishingLevel" "FurnishingLevel" NOT NULL DEFAULT 'FULLY_FURNISHED';

UPDATE "Inspection"
SET "furnishingLevel" = 'UNFURNISHED'
WHERE "fullyFurnished" = false;
