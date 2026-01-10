-- Add anonymous reimbursement fields to ReimbursementRequest

-- Fix VendorMapping transactionType if it's an enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'TransactionType'
    ) THEN
        ALTER TABLE "VendorMapping" 
        ALTER COLUMN "transactionType" TYPE TEXT
        USING "transactionType"::text;
        
        DROP TYPE IF EXISTS "TransactionType";
    END IF;
END$$;

-- Step 1: Add new columns as nullable/with defaults
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "requesterName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "requesterPhone" TEXT;
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "requesterEmail" TEXT;
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "bankName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "bankAccountNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ReimbursementRequest" ADD COLUMN IF NOT EXISTS "trackingCode" TEXT;

-- Step 2: Populate trackingCode for existing records
UPDATE "ReimbursementRequest"
SET "trackingCode" = gen_random_uuid()::text
WHERE "trackingCode" IS NULL;

-- Step 3: Add unique constraint to trackingCode
CREATE UNIQUE INDEX IF NOT EXISTS "ReimbursementRequest_trackingCode_key" ON "ReimbursementRequest"("trackingCode");

-- Step 4: Drop old indexes
DROP INDEX IF EXISTS "ReimbursementRequest_requesterId_idx";

-- Step 5: Add new indexes
CREATE INDEX IF NOT EXISTS "ReimbursementRequest_trackingCode_idx" ON "ReimbursementRequest"("trackingCode");

-- Step 6: Add spending limit to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "reimbursementSpendingLimit" DECIMAL(12,2);

-- Note: requesterId column and relations will be kept for now to prevent breaking changes
-- They will be removed in a separate migration after all code is updated
