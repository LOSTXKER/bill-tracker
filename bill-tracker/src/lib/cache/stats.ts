"use server";

import { prisma } from "@/lib/db";

export type ViewMode = "official" | "internal";

export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Get expense stats - real-time without caching
 * Stats should always be up-to-date
 * 
 * @param companyId - The company ID
 * @param viewMode - "official" (by companyId) or "internal" (by internalCompanyId)
 * @param dateFilter - Optional date range filter
 */
export async function getExpenseStats(
  companyId: string, 
  viewMode: ViewMode = "official",
  dateFilter?: DateRangeFilter
) {
  const now = new Date();
  
  // If date filter provided, use it; otherwise use current month
  const hasDateFilter = dateFilter?.dateFrom || dateFilter?.dateTo;
  
  let startDate: Date;
  let endDate: Date;
  
  if (hasDateFilter) {
    // Use custom date range
    startDate = dateFilter?.dateFrom ? new Date(dateFilter.dateFrom) : new Date(0);
    endDate = dateFilter?.dateTo ? new Date(dateFilter.dateTo) : new Date();
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  // For trend calculation (only when not using custom filter)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Build filter based on viewMode
  // Official view: filter by companyId (what we recorded in our books)
  // Internal view: filter by actual ownership (internalCompanyId or default to companyId if null)
  const companyFilter = viewMode === "internal"
    ? {
        OR: [
          { internalCompanyId: companyId },  // Explicitly belongs to us
          { companyId: companyId, internalCompanyId: null },  // Recorded by us, no internal company = ours
        ]
      }
    : { companyId };  // Official view: filter by companyId

  const expenseFilter = {
    ...companyFilter,
    deletedAt: null,
    OR: [
      { isReimbursement: false },
      { isReimbursement: true, reimbursementStatus: "PAID" as const },
    ],
  };

  // For filtered stats, also apply date filter to workflow status counts
  const filteredExpenseFilter = hasDateFilter 
    ? { ...expenseFilter, billDate: { gte: startDate, lte: endDate } }
    : expenseFilter;

  const [
    periodTotal,
    lastMonthTotal,
    waitingTaxInvoice,
    readyForAccounting,
    sentToAccountant,
    totalExpenses
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...expenseFilter,
        billDate: { gte: startDate, lte: endDate },
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    // Only calculate last month if not using custom filter
    hasDateFilter 
      ? Promise.resolve({ _sum: { netPaid: null } })
      : prisma.expense.aggregate({
          where: {
            ...expenseFilter,
            billDate: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { netPaid: true },
        }),
    prisma.expense.count({
      where: { ...filteredExpenseFilter, workflowStatus: "WAITING_TAX_INVOICE" },
    }),
    prisma.expense.count({
      where: { ...filteredExpenseFilter, workflowStatus: "READY_FOR_ACCOUNTING" },
    }),
    prisma.expense.count({
      where: { ...filteredExpenseFilter, workflowStatus: "SENT_TO_ACCOUNTANT" },
    }),
    prisma.expense.count({
      where: filteredExpenseFilter,
    }),
  ]);

  return {
    monthlyTotal: Number(periodTotal._sum.netPaid) || 0,
    monthlyCount: periodTotal._count,
    lastMonthTotal: Number(lastMonthTotal._sum.netPaid) || 0,
    waitingTaxInvoice,
    readyForAccounting,
    sentToAccountant,
    totalExpenses,
    isFiltered: hasDateFilter,
  };
}

/**
 * Get income stats - real-time without caching
 * Stats should always be up-to-date
 * 
 * @param companyId - The company ID
 * @param dateFilter - Optional date range filter
 */
export async function getIncomeStats(companyId: string, dateFilter?: DateRangeFilter) {
  const now = new Date();
  
  // If date filter provided, use it; otherwise use current month
  const hasDateFilter = dateFilter?.dateFrom || dateFilter?.dateTo;
  
  let startDate: Date;
  let endDate: Date;
  
  if (hasDateFilter) {
    // Use custom date range
    startDate = dateFilter?.dateFrom ? new Date(dateFilter.dateFrom) : new Date(0);
    endDate = dateFilter?.dateTo ? new Date(dateFilter.dateTo) : new Date();
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  // For trend calculation (only when not using custom filter)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const incomeFilter = {
    companyId,
    deletedAt: null,
  };
  
  // For filtered stats, also apply date filter to workflow status counts
  const filteredIncomeFilter = hasDateFilter 
    ? { ...incomeFilter, receiveDate: { gte: startDate, lte: endDate } }
    : incomeFilter;

  const [
    periodTotal,
    lastMonthTotal,
    waitingInvoice,
    waitingWhtCert,
    sentToAccountant,
    totalIncomes
  ] = await Promise.all([
    prisma.income.aggregate({
      where: {
        ...incomeFilter,
        receiveDate: { gte: startDate, lte: endDate },
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    // Only calculate last month if not using custom filter
    hasDateFilter 
      ? Promise.resolve({ _sum: { netReceived: null } })
      : prisma.income.aggregate({
          where: {
            ...incomeFilter,
            receiveDate: { gte: startOfLastMonth, lte: endOfLastMonth },
          },
          _sum: { netReceived: true },
        }),
    prisma.income.count({
      where: { ...filteredIncomeFilter, workflowStatus: "WAITING_INVOICE_ISSUE" },
    }),
    prisma.income.count({
      where: { ...filteredIncomeFilter, workflowStatus: "WHT_PENDING_CERT" },
    }),
    prisma.income.count({
      where: { ...filteredIncomeFilter, workflowStatus: "SENT_TO_ACCOUNTANT" },
    }),
    prisma.income.count({
      where: filteredIncomeFilter,
    }),
  ]);

  return {
    monthlyTotal: Number(periodTotal._sum.netReceived) || 0,
    monthlyCount: periodTotal._count,
    lastMonthTotal: Number(lastMonthTotal._sum.netReceived) || 0,
    waitingInvoice,
    waitingWhtCert,
    sentToAccountant,
    totalIncomes,
    isFiltered: hasDateFilter,
  };
}
