-- AlterTable: Add contact defaults fields
ALTER TABLE "Contact" ADD COLUMN "defaultVatRate" INTEGER;
ALTER TABLE "Contact" ADD COLUMN "defaultWhtEnabled" BOOLEAN;
ALTER TABLE "Contact" ADD COLUMN "defaultWhtRate" DECIMAL(5,2);
ALTER TABLE "Contact" ADD COLUMN "defaultWhtType" TEXT;
ALTER TABLE "Contact" ADD COLUMN "descriptionTemplate" TEXT;
ALTER TABLE "Contact" ADD COLUMN "defaultsLastUpdatedAt" TIMESTAMP(3);
