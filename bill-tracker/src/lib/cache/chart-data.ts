import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getThaiMonthRange, toThaiLocalDate, APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import { buildExpenseBaseWhere, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";

export interface MonthlyDataPoint {
  month: string;
  monthKey: string; // "YYYY-MM" for matching
  income: number;
  expense: number;
  netFlow: number;
}

/**
 * Inner implementation — not exported directly; call via the cached wrapper below.
 */
async function _getMonthlyChartDataImpl(
  companyId: string,
  numMonths: number
): Promise<MonthlyDataPoint[]> {
  const now = toThaiLocalDate(new Date());
  const startMonth = now.getMonth() - (numMonths - 1) + 1; // 1-based
  const startYear = now.getFullYear();
  const { startDate } = getThaiMonthRange(
    startMonth <= 0 ? startYear - 1 : startYear,
    startMonth <= 0 ? startMonth + 12 : startMonth,
  );

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(companyId),
        receiveDate: { gte: startDate },
      },
      select: { receiveDate: true, netReceived: true },
    }),
    prisma.expense.findMany({
      where: {
        ...buildExpenseBaseWhere(companyId),
        billDate: { gte: startDate },
      },
      select: { billDate: true, netPaid: true },
    }),
  ]);

  // Build monthly buckets
  const buckets = new Map<string, { income: number; expense: number }>();

  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { income: 0, expense: 0 });
  }

  for (const row of incomes) {
    if (!row.receiveDate) continue;
    const d = toThaiLocalDate(new Date(row.receiveDate));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.income += Number(row.netReceived) || 0;
  }

  for (const row of expenses) {
    if (!row.billDate) continue;
    const d = toThaiLocalDate(new Date(row.billDate));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.expense += Number(row.netPaid) || 0;
  }

  return Array.from(buckets.entries()).map(([key, { income, expense }]) => {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: date.toLocaleDateString(APP_LOCALE, { month: "short", year: "2-digit", timeZone: APP_TIMEZONE }),
      monthKey: key,
      income,
      expense,
      netFlow: income - expense,
    };
  });
}

/**
 * Cached version: revalidates when expense-stats or income-stats change
 * (same tags as stats.ts, so any transaction create/update busts this too).
 * Revalidates every 60 s at most.
 */
const _cachedGetMonthlyChartData = unstable_cache(
  _getMonthlyChartDataImpl,
  ["chart-data"],
  { revalidate: 60, tags: ["expense-stats", "income-stats"] }
);

/**
 * Public API: fetches 6 months of income and expense aggregates.
 */
export async function getMonthlyChartData(
  companyId: string,
  numMonths: number = 6
): Promise<MonthlyDataPoint[]> {
  return _cachedGetMonthlyChartData(companyId, numMonths);
}

/**
 * Same data, but month label uses short month only (for MonthlyTrendChart)
 */
export async function getMonthlyTrendData(
  companyId: string,
  numMonths: number = 6
): Promise<Array<{ month: string; income: number; expense: number }>> {
  const data = await getMonthlyChartData(companyId, numMonths);
  return data.map(({ monthKey, income, expense }) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: date.toLocaleDateString(APP_LOCALE, { month: "short", timeZone: APP_TIMEZONE }),
      income,
      expense,
    };
  });
}
