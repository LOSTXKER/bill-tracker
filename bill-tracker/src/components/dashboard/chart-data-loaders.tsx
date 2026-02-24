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

  const expenseByAccount = await prisma.expense.groupBy({
    by: ["accountId"],
    where: {
      companyId: companyId,
      billDate: { gte: startOfMonth, lte: endOfMonth },
      accountId: { not: null },
      deletedAt: null,
    },
    _sum: { netPaid: true },
  });

  // Fetch account names
  const accountIds = expenseByAccount.map((item) => item.accountId).filter(Boolean) as string[];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, code: true, name: true },
  });

  const accountMap = new Map(accounts.map((acc) => [acc.id, `${acc.code} ${acc.name}`]));

  let total = 0;
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

  return <ExpenseCategoryChart data={chartData} />;
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
