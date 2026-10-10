CREATE TYPE "PropertyAssetCategory" AS ENUM ('APPLIANCE', 'FIXTURE', 'FURNITURE', 'SURFACE', 'SYSTEM', 'OTHER');
CREATE TYPE "MaintenanceCategory" AS ENUM ('APPLIANCE', 'PLUMBING', 'LOCKSMITH', 'ELECTRICAL', 'AIR_CONDITIONING', 'STRUCTURAL', 'PEST', 'OTHER');
CREATE TYPE "MaintenancePriority" AS ENUM ('ROUTINE', 'URGENT', 'SAFETY_EMERGENCY');
CREATE TYPE "MaintenanceStatus" AS ENUM ('REPORTED', 'ACKNOWLEDGED', 'SCHEDULED', 'AWAITING_CONFIRMATION', 'RESOLVED', 'CLOSED_NO_ACTION');
CREATE TYPE "MaintenanceEventKind" AS ENUM ('REPORTED', 'COMMENT', 'STATUS_CHANGED', 'VISIT_RECORDED', 'VERIFICATION', 'REOPENED');
CREATE TYPE "MaintenanceEvidencePurpose" AS ENUM ('BEFORE', 'AFTER', 'RECEIPT');
CREATE TYPE "MaintenanceVerificationOutcome" AS ENUM ('FIXED', 'NOT_FIXED');
CREATE TYPE "ServiceProviderCategory" AS ENUM ('PLUMBING', 'LOCKSMITH');
CREATE TYPE "NotificationKind" AS ENUM ('MAINTENANCE_REPORTED', 'MAINTENANCE_STATUS', 'MAINTENANCE_VISIT', 'MAINTENANCE_VERIFICATION', 'REPEAT_REPAIR');
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

CREATE TABLE "PropertyAsset" (
  "id" TEXT NOT NULL, "propertyId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "category" "PropertyAssetCategory" NOT NULL, "roomLabel" TEXT, "identifier" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PropertyAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceCase" (
  "id" TEXT NOT NULL, "clientId" TEXT, "tenancyId" TEXT NOT NULL, "propertyAssetId" TEXT,
  "reportedById" TEXT NOT NULL, "category" "MaintenanceCategory" NOT NULL,
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'ROUTINE', "title" TEXT NOT NULL,
  "description" TEXT NOT NULL, "status" "MaintenanceStatus" NOT NULL DEFAULT 'REPORTED',
  "resolutionReason" TEXT, "acknowledgedAt" TIMESTAMP(3), "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceCase_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceEvent" (
  "id" TEXT NOT NULL, "caseId" TEXT NOT NULL, "actorId" TEXT,
  "kind" "MaintenanceEventKind" NOT NULL, "body" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceVisit" (
  "id" TEXT NOT NULL, "caseId" TEXT NOT NULL, "providerId" TEXT, "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "notes" TEXT, "cost" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceVisit_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceEvidence" (
  "id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "caseId" TEXT NOT NULL, "visitId" TEXT,
  "uploadedById" TEXT NOT NULL, "purpose" "MaintenanceEvidencePurpose" NOT NULL,
  "storagePath" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL,
  "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceEvidence_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceVerification" (
  "id" TEXT NOT NULL, "visitId" TEXT NOT NULL, "verifiedById" TEXT NOT NULL,
  "outcome" "MaintenanceVerificationOutcome" NOT NULL, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaintenanceVerification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ServiceProvider" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "category" "ServiceProviderCategory" NOT NULL,
  "phone" TEXT NOT NULL, "whatsapp" TEXT, "serviceAreas" TEXT[], "hours" TEXT,
  "lastVerifiedAt" TIMESTAMP(3) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "kind" "NotificationKind" NOT NULL,
  "title" TEXT NOT NULL, "body" TEXT NOT NULL, "href" TEXT, "dedupeKey" TEXT,
  "readAt" TIMESTAMP(3), "emailTo" TEXT, "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  "emailSentAt" TIMESTAMP(3), "emailError" TEXT, "pushExpandedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DeviceInstallation" (
  "id" TEXT NOT NULL, "stakeholderId" TEXT NOT NULL, "token" TEXT NOT NULL,
  "platform" "DevicePlatform" NOT NULL, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disabledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DeviceInstallation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NotificationPushDelivery" (
  "id" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "installationId" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0, "claimedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPushDelivery_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InspectionItem" ADD COLUMN "propertyAssetId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "maintenanceCaseId" TEXT;
CREATE UNIQUE INDEX "MaintenanceCase_clientId_key" ON "MaintenanceCase"("clientId");
CREATE UNIQUE INDEX "MaintenanceEvidence_clientId_key" ON "MaintenanceEvidence"("clientId");
CREATE UNIQUE INDEX "MaintenanceEvidence_storagePath_key" ON "MaintenanceEvidence"("storagePath");
CREATE UNIQUE INDEX "MaintenanceVerification_visitId_key" ON "MaintenanceVerification"("visitId");
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "DeviceInstallation_token_key" ON "DeviceInstallation"("token");
CREATE UNIQUE INDEX "NotificationPushDelivery_notificationId_installationId_key" ON "NotificationPushDelivery"("notificationId", "installationId");
CREATE UNIQUE INDEX "ServiceProvider_category_phone_key" ON "ServiceProvider"("category", "phone");
CREATE INDEX "PropertyAsset_propertyId_active_idx" ON "PropertyAsset"("propertyId", "active");
CREATE INDEX "PropertyAsset_propertyId_identifier_idx" ON "PropertyAsset"("propertyId", "identifier");
CREATE INDEX "InspectionItem_propertyAssetId_idx" ON "InspectionItem"("propertyAssetId");
CREATE INDEX "Finding_maintenanceCaseId_idx" ON "Finding"("maintenanceCaseId");
CREATE INDEX "MaintenanceCase_tenancyId_status_createdAt_idx" ON "MaintenanceCase"("tenancyId", "status", "createdAt");
CREATE INDEX "MaintenanceCase_propertyAssetId_createdAt_idx" ON "MaintenanceCase"("propertyAssetId", "createdAt");
CREATE INDEX "MaintenanceEvent_caseId_createdAt_idx" ON "MaintenanceEvent"("caseId", "createdAt");
CREATE INDEX "MaintenanceVisit_caseId_completedAt_idx" ON "MaintenanceVisit"("caseId", "completedAt");
CREATE INDEX "MaintenanceEvidence_caseId_createdAt_idx" ON "MaintenanceEvidence"("caseId", "createdAt");
CREATE INDEX "MaintenanceEvidence_visitId_idx" ON "MaintenanceEvidence"("visitId");
CREATE INDEX "ServiceProvider_category_active_idx" ON "ServiceProvider"("category", "active");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_emailSentAt_emailAttempts_createdAt_idx" ON "Notification"("emailSentAt", "emailAttempts", "createdAt");
CREATE INDEX "Notification_pushExpandedAt_createdAt_idx" ON "Notification"("pushExpandedAt", "createdAt");
CREATE INDEX "DeviceInstallation_stakeholderId_disabledAt_lastSeenAt_idx" ON "DeviceInstallation"("stakeholderId", "disabledAt", "lastSeenAt");
CREATE INDEX "NotificationPushDelivery_sentAt_attempts_createdAt_idx" ON "NotificationPushDelivery"("sentAt", "attempts", "createdAt");

ALTER TABLE "PropertyAsset" ADD CONSTRAINT "PropertyAsset_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_propertyAssetId_fkey" FOREIGN KEY ("propertyAssetId") REFERENCES "PropertyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_propertyAssetId_fkey" FOREIGN KEY ("propertyAssetId") REFERENCES "PropertyAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceCase" ADD CONSTRAINT "MaintenanceCase_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_maintenanceCaseId_fkey" FOREIGN KEY ("maintenanceCaseId") REFERENCES "MaintenanceCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MaintenanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceVisit" ADD CONSTRAINT "MaintenanceVisit_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MaintenanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceVisit" ADD CONSTRAINT "MaintenanceVisit_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEvidence" ADD CONSTRAINT "MaintenanceEvidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MaintenanceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEvidence" ADD CONSTRAINT "MaintenanceEvidence_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "MaintenanceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceEvidence" ADD CONSTRAINT "MaintenanceEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceVerification" ADD CONSTRAINT "MaintenanceVerification_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "MaintenanceVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceVerification" ADD CONSTRAINT "MaintenanceVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "Stakeholder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceInstallation" ADD CONSTRAINT "DeviceInstallation_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPushDelivery" ADD CONSTRAINT "NotificationPushDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPushDelivery" ADD CONSTRAINT "NotificationPushDelivery_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "DeviceInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
