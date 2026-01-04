-- Migration: Consolidate Vendor + Customer into Contact, Remove Budget
-- This migration creates a fresh Contact table and removes Budget, Vendor, Customer tables

-- Drop Budget table and enum
DROP TABLE IF EXISTS "Budget" CASCADE;
DROP TYPE IF EXISTS "BudgetPeriod";

-- Drop old Vendor and Customer tables (fresh start as confirmed)
DROP TABLE IF EXISTS "Vendor" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;

-- Create Contact table
CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "taxId" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "bankAccount" TEXT,
  "bankName" TEXT,
  "creditLimit" DECIMAL(12,2),
  "paymentTerms" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- Update Expense table: remove vendor columns, add contactId
ALTER TABLE "Expense" 
  DROP CONSTRAINT IF EXISTS "Expense_vendorId_fkey";

ALTER TABLE "Expense" 
  DROP COLUMN IF EXISTS "vendorId",
  DROP COLUMN IF EXISTS "vendorName",
  DROP COLUMN IF EXISTS "vendorTaxId";

ALTER TABLE "Expense" 
  ADD COLUMN IF NOT EXISTS "contactId" TEXT;

-- Update Income table: remove customer columns, add contactId
ALTER TABLE "Income"
  DROP CONSTRAINT IF EXISTS "Income_customerId_fkey";

ALTER TABLE "Income"
  DROP COLUMN IF EXISTS "customerId",
  DROP COLUMN IF EXISTS "customerName",
  DROP COLUMN IF EXISTS "customerTaxId";

ALTER TABLE "Income"
  ADD COLUMN IF NOT EXISTS "contactId" TEXT;

-- Add foreign key for Contact to Company
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for Expense and Income to Contact
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_contactId_fkey" 
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  
ALTER TABLE "Income" ADD CONSTRAINT "Income_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for Contact
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Contact_name_idx" ON "Contact"("name");
CREATE INDEX "Contact_taxId_idx" ON "Contact"("taxId");

-- Create indexes for contactId in Expense and Income
DROP INDEX IF EXISTS "Expense_vendorId_idx";
CREATE INDEX "Expense_contactId_idx" ON "Expense"("contactId");

DROP INDEX IF EXISTS "Income_customerId_idx";
CREATE INDEX "Income_contactId_idx" ON "Income"("contactId");
