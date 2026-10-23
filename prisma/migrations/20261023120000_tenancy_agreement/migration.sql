CREATE TYPE "SupportingDocumentKind" AS ENUM ('SUPPORTING', 'TENANCY_AGREEMENT');
ALTER TABLE "SupportingDocumentRequest" ADD COLUMN "kind" "SupportingDocumentKind" NOT NULL DEFAULT 'SUPPORTING';
ALTER TABLE "Tenancy" ADD COLUMN "minorRepairClause" JSONB;

-- Other requests remain repeatable; the agreement is one durable slot per tenancy.
CREATE UNIQUE INDEX "SupportingDocumentRequest_one_agreement_per_tenancy"
ON "SupportingDocumentRequest"("tenancyId") WHERE "kind" = 'TENANCY_AGREEMENT';
