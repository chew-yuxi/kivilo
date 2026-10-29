-- CreateEnum
CREATE TYPE "CddStatus" AS ENUM ('WAITING_FOR_CLIENT', 'NEEDS_REVIEW', 'COMPLETE', 'ESCALATED');

-- CreateEnum
CREATE TYPE "CddClientRole" AS ENUM ('LANDLORD', 'TENANT');

-- CreateEnum
CREATE TYPE "CddIdType" AS ENUM ('NRIC', 'FIN', 'PASSPORT', 'COMPANY_REGISTRATION');

-- CreateEnum
CREATE TYPE "CddRiskLevel" AS ENUM ('STANDARD', 'HIGHER');

-- CreateEnum
CREATE TYPE "ScreeningDecision" AS ENUM ('NOT_A_MATCH', 'CONFIRMED_MATCH');

-- CreateEnum
CREATE TYPE "SanctionsSource" AS ENUM ('UN', 'SG');

-- CreateTable
CREATE TABLE "CddCase" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientRole" "CddClientRole" NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "agencyId" TEXT,
    "country" TEXT NOT NULL DEFAULT 'SG',
    "status" "CddStatus" NOT NULL DEFAULT 'WAITING_FOR_CLIENT',
    "riskLevel" "CddRiskLevel",
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CddCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CddParticulars" (
    "caseId" TEXT NOT NULL,
    "kind" "StakeholderKind" NOT NULL,
    "legalName" TEXT NOT NULL,
    "idType" "CddIdType" NOT NULL,
    "idNumberEncrypted" TEXT NOT NULL,
    "idNumberLast4" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "address" TEXT NOT NULL,
    "pepDeclared" BOOLEAN NOT NULL,
    "pepDetails" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedInPerson" BOOLEAN NOT NULL,
    "idSightedById" TEXT,
    "idSightedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CddParticulars_pkey" PRIMARY KEY ("caseId")
);

-- CreateTable
CREATE TABLE "CddBeneficialOwner" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "idType" "CddIdType" NOT NULL,
    "idNumberEncrypted" TEXT NOT NULL,
    "idNumberLast4" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "ownershipPercent" DECIMAL(5,2),
    "pepDeclared" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CddBeneficialOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningRun" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "beneficialOwnerId" TEXT,
    "subjectName" TEXT NOT NULL,
    "subjectBirthYear" INTEGER,
    "provider" TEXT NOT NULL,
    "listVersions" JSONB NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "source" "SanctionsSource" NOT NULL,
    "reference" TEXT NOT NULL,
    "matchedName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "details" JSONB NOT NULL,
    "decision" "ScreeningDecision",
    "reason" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ScreeningCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CddRiskAssessment" (
    "caseId" TEXT NOT NULL,
    "checklistVersion" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "level" "CddRiskLevel" NOT NULL,
    "assessedById" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "CddRiskAssessment_pkey" PRIMARY KEY ("caseId")
);

-- CreateTable
CREATE TABLE "CddEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CddEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionsList" (
    "id" TEXT NOT NULL,
    "source" "SanctionsSource" NOT NULL,
    "publishedAt" TEXT,
    "checksum" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "entries" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanctionsList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CddCase_agentId_idx" ON "CddCase"("agentId");

-- CreateIndex
CREATE INDEX "CddCase_clientId_idx" ON "CddCase"("clientId");

-- CreateIndex
CREATE INDEX "CddCase_tenancyId_idx" ON "CddCase"("tenancyId");

-- CreateIndex
CREATE INDEX "CddCase_agencyId_idx" ON "CddCase"("agencyId");

-- CreateIndex
CREATE INDEX "CddBeneficialOwner_caseId_idx" ON "CddBeneficialOwner"("caseId");

-- CreateIndex
CREATE INDEX "ScreeningRun_caseId_idx" ON "ScreeningRun"("caseId");

-- CreateIndex
CREATE INDEX "ScreeningCandidate_runId_idx" ON "ScreeningCandidate"("runId");

-- CreateIndex
CREATE INDEX "CddEvent_caseId_createdAt_idx" ON "CddEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "SanctionsList_source_fetchedAt_idx" ON "SanctionsList"("source", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SanctionsList_source_checksum_key" ON "SanctionsList"("source", "checksum");

-- AddForeignKey
ALTER TABLE "CddCase" ADD CONSTRAINT "CddCase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddCase" ADD CONSTRAINT "CddCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddCase" ADD CONSTRAINT "CddCase_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddCase" ADD CONSTRAINT "CddCase_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddCase" ADD CONSTRAINT "CddCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddParticulars" ADD CONSTRAINT "CddParticulars_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CddCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddBeneficialOwner" ADD CONSTRAINT "CddBeneficialOwner_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CddCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CddCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningRun" ADD CONSTRAINT "ScreeningRun_beneficialOwnerId_fkey" FOREIGN KEY ("beneficialOwnerId") REFERENCES "CddBeneficialOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningCandidate" ADD CONSTRAINT "ScreeningCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ScreeningRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddRiskAssessment" ADD CONSTRAINT "CddRiskAssessment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CddCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CddEvent" ADD CONSTRAINT "CddEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CddCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Every app table is server-only (see 20261026101000_app_tables_server_only): the Data API
-- must never expose a client's identity documents or screening results.
ALTER TABLE public."CddCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CddParticulars" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CddBeneficialOwner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScreeningRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ScreeningCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CddRiskAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CddEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SanctionsList" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public."CddCase", public."CddParticulars", public."CddBeneficialOwner",
  public."ScreeningRun", public."ScreeningCandidate", public."CddRiskAssessment", public."CddEvent",
  public."SanctionsList" FROM anon, authenticated, PUBLIC;
