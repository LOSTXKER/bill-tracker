-- CreateEnum
CREATE TYPE "ExpenseDocumentType" AS ENUM ('TAX_INVOICE', 'CASH_RECEIPT', 'NO_DOCUMENT');

-- AlterTable - Add documentType column with default
ALTER TABLE "Expense" ADD COLUMN "documentType" "ExpenseDocumentType" NOT NULL DEFAULT 'TAX_INVOICE';

-- Data Migration: Update existing records based on vatRate and hasTaxInvoice
-- VAT 0% with hasTaxInvoice = true -> CASH_RECEIPT (they have some receipt)
UPDATE "Expense" SET "documentType" = 'CASH_RECEIPT' WHERE "vatRate" = 0 AND "hasTaxInvoice" = true;

-- VAT 0% with hasTaxInvoice = false -> NO_DOCUMENT (no document)
UPDATE "Expense" SET "documentType" = 'NO_DOCUMENT' WHERE "vatRate" = 0 AND "hasTaxInvoice" = false;

-- VAT 7% stays as TAX_INVOICE (default)
