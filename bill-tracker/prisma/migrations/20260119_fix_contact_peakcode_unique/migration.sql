-- Drop the global unique constraint on peakCode
DROP INDEX IF EXISTS "Contact_peakCode_key";

-- Drop the redundant peakCode index
DROP INDEX IF EXISTS "Contact_peakCode_idx";

-- Add compound unique constraint (peakCode unique per company)
CREATE UNIQUE INDEX "Contact_companyId_peakCode_key" ON "Contact"("companyId", "peakCode");
