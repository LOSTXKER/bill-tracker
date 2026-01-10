-- CreateEnum
CREATE TYPE "ContactCategory" AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "peakCode" TEXT,
ADD COLUMN "contactCategory" "ContactCategory" NOT NULL DEFAULT 'VENDOR',
ADD COLUMN "entityType" "EntityType" NOT NULL DEFAULT 'COMPANY',
ADD COLUMN "businessType" TEXT,
ADD COLUMN "nationality" TEXT DEFAULT 'ไทย',
ADD COLUMN "prefix" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "subDistrict" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "country" TEXT DEFAULT 'Thailand',
ADD COLUMN "contactPerson" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_peakCode_key" ON "Contact"("peakCode");

-- CreateIndex
CREATE INDEX "Contact_peakCode_idx" ON "Contact"("peakCode");
