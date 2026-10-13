-- One Stakeholder per email address. Production and local data were checked for
-- duplicates and mixed-case addresses on 2026-10-13 and had none, so this only adds
-- the index. If it fails on another database, merge the duplicate rows first.
CREATE UNIQUE INDEX "Stakeholder_email_key" ON "Stakeholder"("email");
