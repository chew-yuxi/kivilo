CREATE TYPE "ProductEventSource" AS ENUM ('WEB', 'ANDROID', 'IOS');

CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "source" "ProductEventSource" NOT NULL,
  "name" TEXT NOT NULL,
  "properties" JSONB NOT NULL,
  "release" TEXT,
  "stakeholderId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductEvent_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");
CREATE INDEX "ProductEvent_stakeholderId_createdAt_idx" ON "ProductEvent"("stakeholderId", "createdAt");
