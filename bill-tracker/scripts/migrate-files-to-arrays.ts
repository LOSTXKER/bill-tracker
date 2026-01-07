#!/usr/bin/env tsx
/**
 * Data Migration Script: Migrate single file URLs to arrays
 * Run this once after deploying the schema changes
 */

// Load environment variables first (before any imports that use them)
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { prisma } from "../src/lib/db";

async function main() {
  console.log("Starting data migration: single files to arrays...\n");

  // Migrate Expenses
  console.log("Migrating Expenses...");
  const expenses = await prisma.expense.findMany({
    select: {
      id: true,
      slipUrl: true,
      taxInvoiceUrl: true,
      whtCertUrl: true,
      slipUrls: true,
      taxInvoiceUrls: true,
      whtCertUrls: true,
    },
  });

  let expensesUpdated = 0;
  for (const expense of expenses) {
    const updates: any = {};
    let hasUpdate = false;

    // Check if slipUrl exists but slipUrls is empty
    if (expense.slipUrl && Array.isArray(expense.slipUrls) && expense.slipUrls.length === 0) {
      updates.slipUrls = [expense.slipUrl];
      hasUpdate = true;
    }

    // Check if taxInvoiceUrl exists but taxInvoiceUrls is empty
    if (expense.taxInvoiceUrl && Array.isArray(expense.taxInvoiceUrls) && expense.taxInvoiceUrls.length === 0) {
      updates.taxInvoiceUrls = [expense.taxInvoiceUrl];
      hasUpdate = true;
    }

    // Check if whtCertUrl exists but whtCertUrls is empty
    if (expense.whtCertUrl && Array.isArray(expense.whtCertUrls) && expense.whtCertUrls.length === 0) {
      updates.whtCertUrls = [expense.whtCertUrl];
      hasUpdate = true;
    }

    if (hasUpdate) {
      await prisma.expense.update({
        where: { id: expense.id },
        data: updates,
      });
      expensesUpdated++;
    }
  }
  console.log(`✓ Updated ${expensesUpdated} expenses\n`);

  // Migrate Incomes
  console.log("Migrating Incomes...");
  const incomes = await prisma.income.findMany({
    select: {
      id: true,
      customerSlipUrl: true,
      myBillCopyUrl: true,
      whtCertUrl: true,
      customerSlipUrls: true,
      myBillCopyUrls: true,
      whtCertUrls: true,
    },
  });

  let incomesUpdated = 0;
  for (const income of incomes) {
    const updates: any = {};
    let hasUpdate = false;

    if (income.customerSlipUrl && Array.isArray(income.customerSlipUrls) && income.customerSlipUrls.length === 0) {
      updates.customerSlipUrls = [income.customerSlipUrl];
      hasUpdate = true;
    }

    if (income.myBillCopyUrl && Array.isArray(income.myBillCopyUrls) && income.myBillCopyUrls.length === 0) {
      updates.myBillCopyUrls = [income.myBillCopyUrl];
      hasUpdate = true;
    }

    if (income.whtCertUrl && Array.isArray(income.whtCertUrls) && income.whtCertUrls.length === 0) {
      updates.whtCertUrls = [income.whtCertUrl];
      hasUpdate = true;
    }

    if (hasUpdate) {
      await prisma.income.update({
        where: { id: income.id },
        data: updates,
      });
      incomesUpdated++;
    }
  }
  console.log(`✓ Updated ${incomesUpdated} incomes\n`);

  console.log("Migration completed successfully!");
  console.log(`Total: ${expensesUpdated} expenses + ${incomesUpdated} incomes updated`);
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
