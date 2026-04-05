import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ExpenseCategoryChart } from "@/components/charts/expense-category-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";
import { getCompanyId } from "@/lib/cache/company";
import { getMonthlyChartData } from "@/lib/cache/chart-data";

export async function CashFlowChartData({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const data = await getMonthlyChartData(companyId, 6);

  return <CashFlowChart data={data} />;
}

export async function MonthlyTrendChartData({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const rawData = await getMonthlyChartData(companyId, 6);
  const data = rawData.map(({ monthKey, income, expense }) => {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: date.toLocaleDateString("th-TH", { month: "short" }),
      income,
      expense,
    };
  });

  return <MonthlyTrendChart data={data} />;
}

export async function ExpenseCategoryChartData({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const baseDateFilter = { companyId, billDate: { gte: startOfMonth, lte: endOfMonth }, deletedAt: null };

  const [expenseByAccount, uncategorized] = await Promise.all([
    prisma.expense.groupBy({
      by: ["accountId"],
      where: { ...baseDateFilter, accountId: { not: null } },
      _sum: { netPaid: true },
    }),
    prisma.expense.aggregate({
      where: { ...baseDateFilter, accountId: null },
      _sum: { netPaid: true },
      _count: true,
    }),
  ]);

  const accountIds = expenseByAccount.map((item) => item.accountId).filter(Boolean) as string[];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });

  const accountMap = new Map(accounts.map((acc) => [acc.id, `${acc.code} ${acc.name}`]));

  const uncategorizedValue = Number(uncategorized._sum.netPaid || 0);
  let total = uncategorizedValue;
  for (const item of expenseByAccount) {
    total += Number(item._sum.netPaid || 0);
  }

  const chartData = expenseByAccount
    .filter((item) => item.accountId)
    .map((item) => {
      const value = Number(item._sum.netPaid) || 0;
      return {
        name: accountMap.get(item.accountId!) || "ไม่ระบุ",
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  if (uncategorizedValue > 0) {
    chartData.push({
      name: `ไม่ระบุบัญชี (${uncategorized._count} รายการ)`,
      value: uncategorizedValue,
      percentage: total > 0 ? (uncategorizedValue / total) * 100 : 0,
    });
  }

  return <ExpenseCategoryChart data={chartData} />;
}

export async function DataQualityStats({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const baseDateFilter = { companyId, billDate: { gte: startOfMonth, lte: endOfMonth }, deletedAt: null };

  const [total, noAccount, noContact] = await Promise.all([
    prisma.expense.count({ where: baseDateFilter }),
    prisma.expense.count({ where: { ...baseDateFilter, accountId: null } }),
    prisma.expense.count({ where: { ...baseDateFilter, contactId: null } }),
  ]);

  if (total === 0) return null;

  const { DataQualityCard } = await import("./data-quality-card");
  return (
    <DataQualityCard
      companyCode={companyCode}
      total={total}
      noAccount={noAccount}
      noContact={noContact}
    />
  );
}

export function ChartSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
