-- AlterTable: Add internalCompanyId to Expense
-- บริษัทจริงภายใน (Internal company for tracking purposes)
ALTER TABLE "Expense" ADD COLUMN "internalCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_internalCompanyId_fkey" FOREIGN KEY ("internalCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Expense_internalCompanyId_idx" ON "Expense"("internalCompanyId");
