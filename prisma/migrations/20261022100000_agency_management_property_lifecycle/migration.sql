-- CreateEnum
CREATE TYPE "AgencyRole" AS ENUM ('OWNER', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "AgencyMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'AGENCY_INVITATION';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "trashExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trashedAt" TIMESTAMP(3),
ADD COLUMN     "trashedById" TEXT;

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "agencyId" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "agencyMembershipId" TEXT;

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,
    "role" "AgencyRole" NOT NULL DEFAULT 'AGENT',
    "status" "AgencyMembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyActivity" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectName" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyMembership_stakeholderId_status_idx" ON "AgencyMembership"("stakeholderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_agencyId_stakeholderId_key" ON "AgencyMembership"("agencyId", "stakeholderId");

-- CreateIndex
CREATE INDEX "AgencyActivity_agencyId_createdAt_idx" ON "AgencyActivity"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "Tenancy_agencyId_idx" ON "Tenancy"("agencyId");

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyActivity" ADD CONSTRAINT "AgencyActivity_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyMembershipId_fkey" FOREIGN KEY ("agencyMembershipId") REFERENCES "AgencyMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
