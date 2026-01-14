"use server";

import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

/**
 * Get expense stats with short-term caching (60 seconds)
 * This balances freshness with performance
 */
export const getExpenseStats = unstable_cache(
  async (companyId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const expenseFilter = {
      companyId,
      deletedAt: null,
      OR: [
        { isReimbursement: false },
        { isReimbursement: true, reimbursementStatus: "PAID" as const },
      ],
    };

    const [
      monthlyTotal,
      lastMonthTotal,
      waitingTaxInvoice,
      readyForAccounting,
      sentToAccountant,
      totalExpenses
    ] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          ...expenseFilter,
          billDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { netPaid: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          ...expenseFilter,
          billDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { netPaid: true },
      }),
      prisma.expense.count({
        where: { ...expenseFilter, workflowStatus: "WAITING_TAX_INVOICE" },
      }),
      prisma.expense.count({
        where: { ...expenseFilter, workflowStatus: "READY_FOR_ACCOUNTING" },
      }),
      prisma.expense.count({
        where: { ...expenseFilter, workflowStatus: "SENT_TO_ACCOUNTANT" },
      }),
      prisma.expense.count({
        where: expenseFilter,
      }),
    ]);

    return {
      monthlyTotal: Number(monthlyTotal._sum.netPaid) || 0,
      monthlyCount: monthlyTotal._count,
      lastMonthTotal: Number(lastMonthTotal._sum.netPaid) || 0,
      waitingTaxInvoice,
      readyForAccounting,
      sentToAccountant,
      totalExpenses,
    };
  },
  ["expense-stats"],
  { revalidate: 60, tags: ["expense-stats"] } // Cache for 60 seconds
);

/**
 * Get income stats with short-term caching (60 seconds)
 */
export const getIncomeStats = unstable_cache(
  async (companyId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const incomeFilter = {
      companyId,
      deletedAt: null,
    };

    const [
      monthlyTotal,
      lastMonthTotal,
      waitingInvoice,
      waitingWhtCert,
      sentToAccountant,
      totalIncomes
    ] = await Promise.all([
      prisma.income.aggregate({
        where: {
          ...incomeFilter,
          receiveDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { netReceived: true },
        _count: true,
      }),
      prisma.income.aggregate({
        where: {
          ...incomeFilter,
          receiveDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { netReceived: true },
      }),
      prisma.income.count({
        where: { ...incomeFilter, workflowStatus: "WAITING_INVOICE_ISSUE" },
      }),
      prisma.income.count({
        where: { ...incomeFilter, workflowStatus: "WHT_PENDING_CERT" },
      }),
      prisma.income.count({
        where: { ...incomeFilter, workflowStatus: "SENT_TO_ACCOUNTANT" },
      }),
      prisma.income.count({
        where: incomeFilter,
      }),
    ]);

    return {
      monthlyTotal: Number(monthlyTotal._sum.netReceived) || 0,
      monthlyCount: monthlyTotal._count,
      lastMonthTotal: Number(lastMonthTotal._sum.netReceived) || 0,
      waitingInvoice,
      waitingWhtCert,
      sentToAccountant,
      totalIncomes,
    };
  },
  ["income-stats"],
  { revalidate: 60, tags: ["income-stats"] } // Cache for 60 seconds
);
