-- Add ApprovalStatus enum
CREATE TYPE "ApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- Add DRAFT to ExpenseWorkflowStatus
ALTER TYPE "ExpenseWorkflowStatus" ADD VALUE 'DRAFT' BEFORE 'PAID';

-- Add DRAFT to IncomeWorkflowStatus
ALTER TYPE "IncomeWorkflowStatus" ADD VALUE 'DRAFT' BEFORE 'RECEIVED';

-- Add notification types for approval workflow
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TRANSACTION_REJECTED';

-- Add document event types for approval workflow
ALTER TYPE "DocumentEventType" ADD VALUE 'SUBMITTED_FOR_APPROVAL';
ALTER TYPE "DocumentEventType" ADD VALUE 'APPROVED';
ALTER TYPE "DocumentEventType" ADD VALUE 'REJECTED';
ALTER TYPE "DocumentEventType" ADD VALUE 'MARKED_AS_PAID';

-- Add approval columns to Expense
ALTER TABLE "Expense" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Expense" ADD COLUMN "rejectedReason" TEXT;
ALTER TABLE "Expense" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "submittedBy" TEXT;

-- Add foreign key for submittedBy in Expense
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for approvalStatus in Expense
CREATE INDEX "Expense_approvalStatus_idx" ON "Expense"("approvalStatus");

-- Add approval columns to Income
ALTER TABLE "Income" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Income" ADD COLUMN "rejectedReason" TEXT;
ALTER TABLE "Income" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Income" ADD COLUMN "submittedBy" TEXT;
ALTER TABLE "Income" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Income" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Add foreign keys for Income approval fields
ALTER TABLE "Income" ADD CONSTRAINT "Income_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Income" ADD CONSTRAINT "Income_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for approvalStatus in Income
CREATE INDEX "Income_approvalStatus_idx" ON "Income"("approvalStatus");

-- Update existing Expense records: set workflowStatus default behavior
-- Existing records with PAID status should stay PAID, not become DRAFT
-- New records will default to DRAFT
-- No data migration needed since existing data is valid

-- Update existing Income records: same logic
-- Existing records with RECEIVED status should stay RECEIVED
-- New records will default to DRAFT
