ALTER TABLE "ReportAddendumEntry"
ADD COLUMN "uploadPaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
