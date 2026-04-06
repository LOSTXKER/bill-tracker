"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { toThaiStartOfDay, toThaiEndOfDay, getThaiMonthRange } from "@/lib/queries/date-utils";

export type ViewMode = "official" | "internal";

export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}

const _getExpenseStats = unstable_cache(
  async (
    companyId: string,
    viewMode: ViewMode,
    dateFrom: string | undefined,
    dateTo: string | undefined
  ) => {
    const dateFilter: DateRangeFilter | undefined =
      dateFrom || dateTo ? { dateFrom, dateTo } : undefined;
    return _expenseStatsImpl(companyId, viewMode, dateFilter);
  },
  ["expense-stats"],
  { revalidate: 60, tags: ["expense-stats"] }
);

/**
 * Get expense stats - cached for 60 seconds per (companyId, viewMode, dateRange) combination.
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
  return _getExpenseStats(companyId, viewMode, dateFilter?.dateFrom, dateFilter?.dateTo);
}

async function _expenseStatsImpl(
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
    startDate = dateFilter?.dateFrom ? toThaiStartOfDay(dateFilter.dateFrom) : new Date(0);
    endDate = dateFilter?.dateTo ? toThaiEndOfDay(dateFilter.dateTo) : new Date();
  } else {
    const range = getThaiMonthRange(now.getFullYear(), now.getMonth() + 1);
    startDate = range.startDate;
    endDate = range.endDate;
  }
  
  // For trend calculation (only when not using custom filter)
  const { startDate: startOfLastMonth, endDate: endOfLastMonth } =
    getThaiMonthRange(now.getFullYear(), now.getMonth());

  // Build expense filter based on viewMode
  const expenseFilter = buildExpenseWhereForMode(companyId, viewMode);

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
      where: { ...filteredExpenseFilter, workflowStatus: "ACTIVE", hasTaxInvoice: false },
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

const _getIncomeStats = unstable_cache(
  async (
    companyId: string,
    dateFrom: string | undefined,
    dateTo: string | undefined
  ) => {
    const dateFilter: DateRangeFilter | undefined =
      dateFrom || dateTo ? { dateFrom, dateTo } : undefined;
    return _incomeStatsImpl(companyId, dateFilter);
  },
  ["income-stats"],
  { revalidate: 60, tags: ["income-stats"] }
);

/**
 * Get income stats - cached for 60 seconds per (companyId, dateRange) combination.
 *
 * @param companyId - The company ID
 * @param dateFilter - Optional date range filter
 */
export async function getIncomeStats(companyId: string, dateFilter?: DateRangeFilter) {
  return _getIncomeStats(companyId, dateFilter?.dateFrom, dateFilter?.dateTo);
}

async function _incomeStatsImpl(companyId: string, dateFilter?: DateRangeFilter) {
  const now = new Date();
  
  // If date filter provided, use it; otherwise use current month
  const hasDateFilter = dateFilter?.dateFrom || dateFilter?.dateTo;
  
  let startDate: Date;
  let endDate: Date;
  
  if (hasDateFilter) {
    startDate = dateFilter?.dateFrom ? toThaiStartOfDay(dateFilter.dateFrom) : new Date(0);
    endDate = dateFilter?.dateTo ? toThaiEndOfDay(dateFilter.dateTo) : new Date();
  } else {
    const range = getThaiMonthRange(now.getFullYear(), now.getMonth() + 1);
    startDate = range.startDate;
    endDate = range.endDate;
  }
  
  // For trend calculation (only when not using custom filter)
  const { startDate: startOfLastMonth, endDate: endOfLastMonth } =
    getThaiMonthRange(now.getFullYear(), now.getMonth());

  const incomeFilter = buildIncomeBaseWhere(companyId);

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
      where: { ...filteredIncomeFilter, workflowStatus: "ACTIVE", hasInvoice: false },
    }),
    prisma.income.count({
      where: { ...filteredIncomeFilter, workflowStatus: "ACTIVE", isWhtDeducted: true, hasWhtCert: false },
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
