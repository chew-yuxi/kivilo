-- All product authorization runs through the server Prisma data layer.
-- These explicit Prisma-owned public tables must never be exposed through the Data API.
-- Auth, Storage and extension schemas are intentionally outside this migration.
-- The database owner retains normal Prisma and migration access.
-- Future Prisma tables created by this migration owner must start private as well.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated, PUBLIC;

ALTER TABLE public."Stakeholder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AccountAcquisition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Agency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgencyBranding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgencyMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgencyActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AgentBranding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PropertyEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BinItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tenancy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TenancyCollaborator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InspectionAccessGrant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Capture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InspectionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ItemEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PropertyAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MaintenanceCase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MaintenanceEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MaintenanceVisit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MaintenanceEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MaintenanceVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ResponsibilityProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceProvider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportingDocumentRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SupportingDocumentFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DeviceInstallation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotificationPushDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Finding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FindingPhotoDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FindingPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Signature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportEmail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssessmentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportAddendum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportAddendumEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReportAddendumPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AddendumAcknowledgement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AccountDeletionRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AccountDeletionStoragePurge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StoragePurge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ErrorEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."IssuedReportFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AssessmentResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public."Stakeholder",
  public."AccountAcquisition",
  public."Team",
  public."Agency",
  public."AgencyBranding",
  public."AgencyMembership",
  public."AgencyActivity",
  public."Subscription",
  public."AgentBranding",
  public."Property",
  public."PropertyEvent",
  public."BinItem",
  public."Tenancy",
  public."TenancyCollaborator",
  public."Inspection",
  public."InspectionAccessGrant",
  public."Capture",
  public."Room",
  public."InspectionItem",
  public."ItemEvidence",
  public."PropertyAsset",
  public."MaintenanceCase",
  public."MaintenanceEvent",
  public."MaintenanceVisit",
  public."MaintenanceEvidence",
  public."MaintenanceVerification",
  public."ResponsibilityProposal",
  public."ServiceProvider",
  public."SupportingDocumentRequest",
  public."SupportingDocumentFile",
  public."DeviceInstallation",
  public."Notification",
  public."NotificationPushDelivery",
  public."Finding",
  public."FindingPhotoDraft",
  public."FindingPhoto",
  public."Signature",
  public."ReportEmail",
  public."AssessmentVersion",
  public."ReportAddendum",
  public."ReportAddendumEntry",
  public."ReportAddendumPhoto",
  public."AddendumAcknowledgement",
  public."AccountDeletionRequest",
  public."AccountDeletionStoragePurge",
  public."StoragePurge",
  public."ErrorEvent",
  public."ProductEvent",
  public."IssuedReportFile",
  public."AssessmentResponse",
  public."_prisma_migrations"
FROM anon, authenticated, PUBLIC;
