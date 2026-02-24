import { prisma } from "@/lib/db";

export interface MonthlyDataPoint {
  month: string;
  monthKey: string; // "YYYY-MM" for matching
  income: number;
  expense: number;
  netFlow: number;
}

/**
 * Fetches 6 months of income and expense aggregates using 2 queries instead of 12.
 * Groups results by month in JS after fetching.
 */
export async function getMonthlyChartData(
  companyId: string,
  numMonths: number = 6
): Promise<MonthlyDataPoint[]> {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - (numMonths - 1), 1);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        companyId,
        receiveDate: { gte: startDate },
        deletedAt: null,
      },
      select: { receiveDate: true, netReceived: true },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        billDate: { gte: startDate },
        deletedAt: null,
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
    const d = new Date(row.receiveDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.income += Number(row.netReceived) || 0;
  }

  for (const row of expenses) {
    if (!row.billDate) continue;
    const d = new Date(row.billDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.expense += Number(row.netPaid) || 0;
  }

  return Array.from(buckets.entries()).map(([key, { income, expense }]) => {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: date.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      monthKey: key,
      income,
      expense,
      netFlow: income - expense,
    };
  });
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
      month: date.toLocaleDateString("th-TH", { month: "short" }),
      income,
      expense,
    };
  });
}
