-- Acquisition and payment milestones are written by verified server flows only.
-- Supabase exposes public through its Data API, so no client role may use this table.
-- Prisma's database owner keeps its existing access; no client RLS policies exist.
ALTER TABLE public."AccountAcquisition" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."AccountAcquisition" FROM anon, authenticated, PUBLIC;
