-- Add documentCode (เลขที่เอกสารใบสำคัญ) for Expense and Income
-- Format: PV-YYYYMM-NNNN (Expense / Payment Voucher)
--         RV-YYYYMM-NNNN (Income  / Receipt Voucher)
-- Unique per company. Existing rows are backfilled by scripts/backfill-document-codes.ts

ALTER TABLE "Expense" ADD COLUMN "documentCode" TEXT;
ALTER TABLE "Income"  ADD COLUMN "documentCode" TEXT;

-- Unique constraints (NULLs are allowed and ignored by Postgres)
CREATE UNIQUE INDEX "Expense_companyId_documentCode_key"
  ON "Expense"("companyId", "documentCode");

CREATE UNIQUE INDEX "Income_companyId_documentCode_key"
  ON "Income"("companyId", "documentCode");
