-- Read-only report link handed to the landlord and tenant.
-- Nullable: a report has no link until someone shares it, and revoking a link is
-- setting this back to NULL. Postgres treats NULLs as distinct, so many unshared
-- inspections coexist under the unique index without collision.
ALTER TABLE "Inspection" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "Inspection" ADD COLUMN "sharedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Inspection_shareToken_key" ON "Inspection"("shareToken");
