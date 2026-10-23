ALTER TYPE "NotificationKind" ADD VALUE 'SUPPORTING_DOCUMENT_REQUESTED';
ALTER TYPE "NotificationKind" ADD VALUE 'SUPPORTING_DOCUMENT_UPLOADED';

CREATE TABLE "SupportingDocumentRequest" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportingDocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportingDocumentFile" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "SupportingDocumentFile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportingDocumentFile_byteSize_check" CHECK ("byteSize" > 0 AND "byteSize" <= 10485760),
    CONSTRAINT "SupportingDocumentFile_mimeType_check" CHECK ("mimeType" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
);

CREATE UNIQUE INDEX "SupportingDocumentRequest_tenancyId_clientId_key" ON "SupportingDocumentRequest"("tenancyId", "clientId");
CREATE INDEX "SupportingDocumentRequest_requestedById_idx" ON "SupportingDocumentRequest"("requestedById");
CREATE UNIQUE INDEX "SupportingDocumentFile_clientId_key" ON "SupportingDocumentFile"("clientId");
CREATE UNIQUE INDEX "SupportingDocumentFile_storagePath_key" ON "SupportingDocumentFile"("storagePath");
CREATE INDEX "SupportingDocumentFile_requestId_submittedAt_idx" ON "SupportingDocumentFile"("requestId", "submittedAt");
CREATE INDEX "SupportingDocumentFile_submittedById_idx" ON "SupportingDocumentFile"("submittedById");
ALTER TABLE "SupportingDocumentRequest" ADD CONSTRAINT "SupportingDocumentRequest_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportingDocumentRequest" ADD CONSTRAINT "SupportingDocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportingDocumentFile" ADD CONSTRAINT "SupportingDocumentFile_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SupportingDocumentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportingDocumentFile" ADD CONSTRAINT "SupportingDocumentFile_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
