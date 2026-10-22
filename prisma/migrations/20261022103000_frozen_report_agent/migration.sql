-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "reportAgentId" TEXT,
ADD COLUMN "reportAgentFrozen" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the exact responsible person the existing report was signed against.
UPDATE "Inspection" i SET "reportAgentId" = t."agentId", "reportAgentFrozen" = true
FROM "Tenancy" t
WHERE i."tenancyId" = t."id" AND i."status" IN ('AWAITING_SIGNATURE', 'COMPLETED');

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_reportAgentId_fkey" FOREIGN KEY ("reportAgentId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
