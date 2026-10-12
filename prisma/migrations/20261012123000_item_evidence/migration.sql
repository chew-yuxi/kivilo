-- Inventory lines can cite several original room captures. Seed the existing
-- AI-selected source link so deployed reports keep their current evidence relation.
CREATE TABLE "ItemEvidence" (
    "itemId" TEXT NOT NULL,
    "captureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemEvidence_pkey" PRIMARY KEY ("itemId", "captureId")
);

INSERT INTO "ItemEvidence" ("itemId", "captureId")
SELECT "id", "sourceCaptureId"
FROM "InspectionItem"
WHERE "sourceCaptureId" IS NOT NULL;

CREATE INDEX "ItemEvidence_captureId_idx" ON "ItemEvidence"("captureId");

ALTER TABLE "ItemEvidence"
ADD CONSTRAINT "ItemEvidence_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "InspectionItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItemEvidence"
ADD CONSTRAINT "ItemEvidence_captureId_fkey"
FOREIGN KEY ("captureId") REFERENCES "Capture"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
