/*
  Warnings:

  - Made the column `slipUrls` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `taxInvoiceUrls` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `whtCertUrls` on table `Expense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `customerSlipUrls` on table `Income` required. This step will fail if there are existing NULL values in that column.
  - Made the column `myBillCopyUrls` on table `Income` required. This step will fail if there are existing NULL values in that column.
  - Made the column `whtCertUrls` on table `Income` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "slipUrls" SET NOT NULL,
ALTER COLUMN "taxInvoiceUrls" SET NOT NULL,
ALTER COLUMN "whtCertUrls" SET NOT NULL;

-- AlterTable
ALTER TABLE "Income" ALTER COLUMN "customerSlipUrls" SET NOT NULL,
ALTER COLUMN "myBillCopyUrls" SET NOT NULL,
ALTER COLUMN "whtCertUrls" SET NOT NULL;
