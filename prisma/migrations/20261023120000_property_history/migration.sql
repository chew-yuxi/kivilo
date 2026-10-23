-- CreateTable
CREATE TABLE "PropertyEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenancyId" TEXT,
    "inspectionId" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "subjectKey" TEXT,
    "binItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinItem" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "deletedById" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "restoredAt" TIMESTAMP(3),
    "restoredById" TEXT,

    CONSTRAINT "BinItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyEvent_propertyId_createdAt_idx" ON "PropertyEvent"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyEvent_subjectKey_actorId_updatedAt_idx" ON "PropertyEvent"("subjectKey", "actorId", "updatedAt");

-- CreateIndex
CREATE INDEX "BinItem_expiresAt_idx" ON "BinItem"("expiresAt");

-- CreateIndex
CREATE INDEX "BinItem_inspectionId_idx" ON "BinItem"("inspectionId");

-- AddForeignKey
ALTER TABLE "PropertyEvent" ADD CONSTRAINT "PropertyEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyEvent" ADD CONSTRAINT "PropertyEvent_binItemId_fkey" FOREIGN KEY ("binItemId") REFERENCES "BinItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinItem" ADD CONSTRAINT "BinItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
