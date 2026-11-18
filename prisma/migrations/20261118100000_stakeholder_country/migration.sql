-- AlterTable
ALTER TABLE "Stakeholder" ADD COLUMN     "country" "Country";

-- Every account from before countries works in Singapore and is never asked.
UPDATE "Stakeholder" SET "country" = 'SG';
