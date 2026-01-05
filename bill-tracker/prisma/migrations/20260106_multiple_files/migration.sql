-- Migration: Support multiple files for expense/income documents
-- Convert single file URLs to JSON arrays

-- Step 1: Add new columns for JSON arrays
ALTER TABLE "Expense" ADD COLUMN "slipUrls" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "Expense" ADD COLUMN "taxInvoiceUrls" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "Expense" ADD COLUMN "whtCertUrls" JSONB DEFAULT '[]'::jsonb;

ALTER TABLE "Income" ADD COLUMN "customerSlipUrls" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "Income" ADD COLUMN "myBillCopyUrls" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "Income" ADD COLUMN "whtCertUrls" JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from old columns to new columns
UPDATE "Expense"
SET "slipUrls" = jsonb_build_array("slipUrl")
WHERE "slipUrl" IS NOT NULL;

UPDATE "Expense"
SET "taxInvoiceUrls" = jsonb_build_array("taxInvoiceUrl")
WHERE "taxInvoiceUrl" IS NOT NULL;

UPDATE "Expense"
SET "whtCertUrls" = jsonb_build_array("whtCertUrl")
WHERE "whtCertUrl" IS NOT NULL;

UPDATE "Income"
SET "customerSlipUrls" = jsonb_build_array("customerSlipUrl")
WHERE "customerSlipUrl" IS NOT NULL;

UPDATE "Income"
SET "myBillCopyUrls" = jsonb_build_array("myBillCopyUrl")
WHERE "myBillCopyUrl" IS NOT NULL;

UPDATE "Income"
SET "whtCertUrls" = jsonb_build_array("whtCertUrl")
WHERE "whtCertUrl" IS NOT NULL;

-- Step 3: Drop old columns (keep for now as backup - can be removed later)
-- ALTER TABLE "Expense" DROP COLUMN "slipUrl";
-- ALTER TABLE "Expense" DROP COLUMN "taxInvoiceUrl";
-- ALTER TABLE "Expense" DROP COLUMN "whtCertUrl";
-- ALTER TABLE "Income" DROP COLUMN "customerSlipUrl";
-- ALTER TABLE "Income" DROP COLUMN "myBillCopyUrl";
-- ALTER TABLE "Income" DROP COLUMN "whtCertUrl";
