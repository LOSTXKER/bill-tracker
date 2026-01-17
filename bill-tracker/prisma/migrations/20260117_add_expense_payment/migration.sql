-- CreateEnum
CREATE TYPE "PaidByType" AS ENUM ('COMPANY', 'PETTY_CASH', 'USER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SETTLED');

-- CreateTable
CREATE TABLE "ExpensePayment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "paidByType" "PaidByType" NOT NULL,
    "paidByUserId" TEXT,
    "paidByName" TEXT,
    "paidByBankName" TEXT,
    "paidByBankAccount" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "settledAt" TIMESTAMP(3),
    "settledBy" TEXT,
    "settlementRef" TEXT,
    "settlementSlipUrls" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpensePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpensePayment_expenseId_idx" ON "ExpensePayment"("expenseId");

-- CreateIndex
CREATE INDEX "ExpensePayment_paidByUserId_idx" ON "ExpensePayment"("paidByUserId");

-- CreateIndex
CREATE INDEX "ExpensePayment_settlementStatus_idx" ON "ExpensePayment"("settlementStatus");

-- CreateIndex
CREATE INDEX "ExpensePayment_paidByType_settlementStatus_idx" ON "ExpensePayment"("paidByType", "settlementStatus");

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpensePayment" ADD CONSTRAINT "ExpensePayment_settledBy_fkey" FOREIGN KEY ("settledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
