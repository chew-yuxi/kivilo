-- CreateEnum
CREATE TYPE "Country" AS ENUM ('SG', 'MY');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "country" "Country" NOT NULL DEFAULT 'SG';
