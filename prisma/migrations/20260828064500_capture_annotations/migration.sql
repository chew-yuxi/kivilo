-- Marks the inspector drew over a photo: normalized 0..1 against the upright intrinsic
-- box, plus that box's size, so the same numbers re-render at any size. The stored
-- capture object is never rewritten, because the photograph is the evidence.
--
-- Nullable and additive: every existing capture reads as unmarked, so there is nothing
-- to backfill. Nothing queries a mark independently of its capture, so no index.
ALTER TABLE "Capture" ADD COLUMN "annotations" JSONB;
