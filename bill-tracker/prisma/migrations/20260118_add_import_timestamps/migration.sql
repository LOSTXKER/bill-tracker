-- Add import timestamp fields to Company table
-- These fields track when accounts/contacts were last imported from Peak

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "lastAccountImportAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "lastContactImportAt" TIMESTAMP(3);
