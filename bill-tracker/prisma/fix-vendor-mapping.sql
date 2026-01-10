-- Fix VendorMapping transactionType column type
ALTER TABLE "VendorMapping" 
ALTER COLUMN "transactionType" TYPE TEXT 
USING "transactionType"::text;

-- Drop the old enum type if exists
DROP TYPE IF EXISTS "TransactionType";
