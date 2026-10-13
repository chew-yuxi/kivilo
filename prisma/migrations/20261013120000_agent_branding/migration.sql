-- How an agent's reports are headed. Additive.

-- CreateTable
CREATE TABLE "AgentBranding" (
    "stakeholderId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "agencyLicence" TEXT,
    "ceaRegistration" TEXT,
    "phone" TEXT,
    "logoPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentBranding_pkey" PRIMARY KEY ("stakeholderId")
);
-- AddForeignKey
ALTER TABLE "AgentBranding" ADD CONSTRAINT "AgentBranding_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
