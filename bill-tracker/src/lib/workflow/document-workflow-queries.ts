/**
 * document-workflow-queries.ts
 *
 * Data-fetching layer for the document workflow module.
 * Provides `getWorkflowPendingItems` which aggregates all pending document
 * tasks (tax invoices, WHT certificates, accounting queue) for a company.
 */

import { prisma } from "@/lib/db";
import type { Expense, Income, Contact } from "@prisma/client";
import { reimbursementFilter, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";

type ExpenseWithContact = Expense & { Contact: Contact | null; contact: Contact | null };
type IncomeWithContact = Income & { Contact: Contact | null; contact: Contact | null };

export type WorkflowExpenseItem = ExpenseWithContact & { pendingType: string };
export type WorkflowIncomeItem = IncomeWithContact & { pendingType: string };

export interface WorkflowPendingResults {
  expenses: WorkflowExpenseItem[];
  incomes: WorkflowIncomeItem[];
  summary: {
    pendingTaxInvoice: number;
    pendingWhtIssue: number;
    pendingWhtCert: number;
    pendingAccounting: number;
    total: number;
  };
}

export async function getWorkflowPendingItems(
  companyId: string,
  type: string
): Promise<WorkflowPendingResults> {
  const results: WorkflowPendingResults = {
    expenses: [],
    incomes: [],
    summary: {
      pendingTaxInvoice: 0,
      pendingWhtIssue: 0,
      pendingWhtCert: 0,
      pendingAccounting: 0,
      total: 0,
    },
  };

  if (type === "all" || type === "expense") {
    const pendingTaxInvoiceRaw = await prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId,
        deletedAt: null,
        workflowStatus: "ACTIVE",
        hasTaxInvoice: false,
        documentType: { not: "NO_DOCUMENT" },
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingTaxInvoice = pendingTaxInvoiceRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    const pendingWhtIssueRaw = await prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId,
        deletedAt: null,
        isWht: true,
        workflowStatus: "ACTIVE",
        hasWhtCert: false,
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingWhtIssue = pendingWhtIssueRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    const pendingAccountingRaw = await prisma.expense.findMany({
      where: {
        ...reimbursementFilter,
        companyId,
        deletedAt: null,
        workflowStatus: "READY_FOR_ACCOUNTING",
      },
      include: { Contact: true },
      orderBy: { billDate: "desc" },
      take: 50,
    });
    const pendingAccounting = pendingAccountingRaw.map((e) => ({
      ...e,
      contact: e.Contact,
    }));

    results.expenses = [
      ...pendingTaxInvoice.map((e) => ({ ...e, pendingType: "TAX_INVOICE" })),
      ...pendingWhtIssue.map((e) => ({ ...e, pendingType: "WHT_ISSUE" })),
      ...pendingAccounting.map((e) => ({ ...e, pendingType: "ACCOUNTING" })),
    ];

    results.summary.pendingTaxInvoice = pendingTaxInvoice.length;
    results.summary.pendingWhtIssue = pendingWhtIssue.length;
  }

  if (type === "all" || type === "income") {
    const pendingWhtCertRaw = await prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(companyId),
        isWhtDeducted: true,
        workflowStatus: "ACTIVE",
        hasWhtCert: false,
      },
      include: { Contact: true },
      orderBy: { receiveDate: "desc" },
      take: 50,
    });
    const pendingWhtCert = pendingWhtCertRaw.map((i) => ({
      ...i,
      contact: i.Contact,
    }));

    const pendingAccountingIncomeRaw = await prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(companyId),
        workflowStatus: "READY_FOR_ACCOUNTING",
      },
      include: { Contact: true },
      orderBy: { receiveDate: "desc" },
      take: 50,
    });
    const pendingAccountingIncome = pendingAccountingIncomeRaw.map((i) => ({
      ...i,
      contact: i.Contact,
    }));

    results.incomes = [
      ...pendingWhtCert.map((i) => ({ ...i, pendingType: "WHT_CERT" })),
      ...pendingAccountingIncome.map((i) => ({ ...i, pendingType: "ACCOUNTING" })),
    ];

    results.summary.pendingWhtCert = pendingWhtCert.length;
  }

  results.summary.pendingAccounting =
    results.expenses.filter((e) => e.pendingType === "ACCOUNTING").length +
    results.incomes.filter((i) => i.pendingType === "ACCOUNTING").length;
  results.summary.total = results.expenses.length + results.incomes.length;

  return results;
}
