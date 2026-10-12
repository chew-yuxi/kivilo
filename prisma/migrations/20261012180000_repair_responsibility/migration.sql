-- Who arranges a repair and who pays: proposals answered by the other side, plus the
-- two tenancy terms that shape them.

-- CreateEnum
CREATE TYPE "RepairParty" AS ENUM ('LANDLORD', 'TENANT');

-- CreateEnum
CREATE TYPE "CostPayer" AS ENUM ('LANDLORD', 'TENANT', 'SHARED');

-- CreateEnum
CREATE TYPE "ResponsibilityBasis" AS ENUM ('MINOR_REPAIR_CLAUSE', 'TENANT_CAUSED', 'FAIR_WEAR', 'LANDLORD_OBLIGATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED');

-- AlterEnum


ALTER TYPE "MaintenanceEventKind" ADD VALUE 'RESPONSIBILITY_PROPOSED';
ALTER TYPE "MaintenanceEventKind" ADD VALUE 'RESPONSIBILITY_ACCEPTED';
ALTER TYPE "MaintenanceEventKind" ADD VALUE 'RESPONSIBILITY_REJECTED';
ALTER TYPE "MaintenanceEventKind" ADD VALUE 'RESPONSIBILITY_WITHDRAWN';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'MAINTENANCE_RESPONSIBILITY';

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "agentMayAgreeCosts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minorRepairCap" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "ResponsibilityProposal" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "arrangedBy" "RepairParty" NOT NULL,
    "payer" "CostPayer" NOT NULL,
    "tenantCap" DECIMAL(10,2),
    "basis" "ResponsibilityBasis" NOT NULL,
    "reason" TEXT NOT NULL,
    "clauseRef" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponsibilityProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResponsibilityProposal_caseId_createdAt_idx" ON "ResponsibilityProposal"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResponsibilityProposal" ADD CONSTRAINT "ResponsibilityProposal_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MaintenanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibilityProposal" ADD CONSTRAINT "ResponsibilityProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibilityProposal" ADD CONSTRAINT "ResponsibilityProposal_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A case has at most one open proposal and one standing agreement. Prisma cannot
-- express a partial unique index, so it lives only here.
CREATE UNIQUE INDEX "ResponsibilityProposal_one_pending" ON "ResponsibilityProposal"("caseId") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "ResponsibilityProposal_one_accepted" ON "ResponsibilityProposal"("caseId") WHERE "status" = 'ACCEPTED';

-- A shared split is meaningless without the amount the tenant carries.
ALTER TABLE "ResponsibilityProposal" ADD CONSTRAINT "ResponsibilityProposal_shared_cap"
CHECK (("payer" = 'SHARED') = ("tenantCap" IS NOT NULL));
