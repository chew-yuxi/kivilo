ALTER TABLE "Inspection" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Inspection_clientId_key" ON "Inspection"("clientId");
