-- Links a Stakeholder to a Supabase auth user. Null for everyone who never signs in,
-- which is most stakeholders: landlords and tenants appear on deals without accounts.
ALTER TABLE "Stakeholder" ADD COLUMN "authUserId" TEXT;

CREATE UNIQUE INDEX "Stakeholder_authUserId_key" ON "Stakeholder"("authUserId");
