-- Workflow Checklist Refactor: Replace granular workflow statuses with macro statuses
-- Old enums: ExpenseWorkflowStatus (10 values), IncomeWorkflowStatus (11 values)
-- New enum: WorkflowStatus (6 values): DRAFT, PENDING_APPROVAL, ACTIVE, READY_FOR_ACCOUNTING, SENT_TO_ACCOUNTANT, COMPLETED

-- Step 1: Create the new enum type
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'READY_FOR_ACCOUNTING', 'SENT_TO_ACCOUNTANT', 'COMPLETED');

-- Step 2: Migrate Expense data - add temp column, migrate, swap
ALTER TABLE "Expense" ADD COLUMN "workflowStatus_new" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Expense" SET "workflowStatus_new" = 'PENDING_APPROVAL'
  WHERE "workflowStatus" = 'DRAFT' AND "approvalStatus" = 'PENDING';

UPDATE "Expense" SET "workflowStatus_new" = 'ACTIVE'
  WHERE "workflowStatus"::text IN (
    'PAID', 'WAITING_TAX_INVOICE', 'TAX_INVOICE_RECEIVED',
    'WHT_PENDING_ISSUE', 'WHT_ISSUED', 'WHT_SENT_TO_VENDOR'
  );

UPDATE "Expense" SET "workflowStatus_new" = 'READY_FOR_ACCOUNTING'
  WHERE "workflowStatus"::text = 'READY_FOR_ACCOUNTING';

UPDATE "Expense" SET "workflowStatus_new" = 'SENT_TO_ACCOUNTANT'
  WHERE "workflowStatus"::text = 'SENT_TO_ACCOUNTANT';

UPDATE "Expense" SET "workflowStatus_new" = 'COMPLETED'
  WHERE "workflowStatus"::text = 'COMPLETED';

-- Remaining DRAFT rows (not PENDING) keep default DRAFT

ALTER TABLE "Expense" DROP COLUMN "workflowStatus";
ALTER TABLE "Expense" RENAME COLUMN "workflowStatus_new" TO "workflowStatus";

-- Step 3: Migrate Income data
ALTER TABLE "Income" ADD COLUMN "workflowStatus_new" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Income" SET "workflowStatus_new" = 'PENDING_APPROVAL'
  WHERE "workflowStatus" = 'DRAFT' AND "approvalStatus" = 'PENDING';

UPDATE "Income" SET "workflowStatus_new" = 'ACTIVE'
  WHERE "workflowStatus"::text IN (
    'RECEIVED', 'NO_INVOICE_NEEDED', 'WAITING_INVOICE_ISSUE',
    'INVOICE_ISSUED', 'INVOICE_SENT',
    'WHT_PENDING_CERT', 'WHT_CERT_RECEIVED'
  );

UPDATE "Income" SET "workflowStatus_new" = 'READY_FOR_ACCOUNTING'
  WHERE "workflowStatus"::text = 'READY_FOR_ACCOUNTING';

UPDATE "Income" SET "workflowStatus_new" = 'SENT_TO_ACCOUNTANT'
  WHERE "workflowStatus"::text = 'SENT_TO_ACCOUNTANT';

UPDATE "Income" SET "workflowStatus_new" = 'COMPLETED'
  WHERE "workflowStatus"::text = 'COMPLETED';

ALTER TABLE "Income" DROP COLUMN "workflowStatus";
ALTER TABLE "Income" RENAME COLUMN "workflowStatus_new" TO "workflowStatus";

-- Step 4: Drop old enum types
DROP TYPE IF EXISTS "ExpenseWorkflowStatus";
DROP TYPE IF EXISTS "IncomeWorkflowStatus";

-- Step 5: Recreate indexes
CREATE INDEX "Expense_companyId_workflowStatus_billDate_idx" ON "Expense"("companyId", "workflowStatus", "billDate");
CREATE INDEX "Expense_companyId_workflowStatus_hasTaxInvoice_billDate_idx" ON "Expense"("companyId", "workflowStatus", "hasTaxInvoice", "billDate");
CREATE INDEX "Expense_companyId_workflowStatus_isWht_hasWhtCert_billDat_idx" ON "Expense"("companyId", "workflowStatus", "isWht", "hasWhtCert", "billDate");
CREATE INDEX "Expense_workflowStatus_idx" ON "Expense"("workflowStatus");

CREATE INDEX "Income_companyId_workflowStatus_receiveDate_idx" ON "Income"("companyId", "workflowStatus", "receiveDate");
CREATE INDEX "Income_workflowStatus_idx" ON "Income"("workflowStatus");
