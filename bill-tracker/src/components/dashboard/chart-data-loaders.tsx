import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ExpenseCategoryChart } from "@/components/charts/expense-category-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";

export async function CashFlowChartData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.income.aggregate({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netReceived: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId: company.id,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netPaid: true },
      }),
    ]);

    const income = Number(incomeSum._sum.netReceived) || 0;
    const expense = Number(expenseSum._sum.netPaid) || 0;

    months.push({
      month: monthDate.toLocaleDateString("th-TH", {
        month: "short",
        year: "2-digit",
      }),
      income,
      expense,
      netFlow: income - expense,
    });
  }

  return <CashFlowChart data={months} />;
}

export async function MonthlyTrendChartData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.income.aggregate({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netReceived: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId: company.id,
          billDate: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        _sum: { netPaid: true },
      }),
    ]);

    months.push({
      month: monthDate.toLocaleDateString("th-TH", { month: "short" }),
      income: Number(incomeSum._sum.netReceived) || 0,
      expense: Number(expenseSum._sum.netPaid) || 0,
    });
  }

  return <MonthlyTrendChart data={months} />;
}

export async function ExpenseCategoryChartData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenseByCategory = await prisma.expense.groupBy({
    by: ["categoryId"],
    where: {
      companyId: company.id,
      billDate: { gte: startOfMonth, lte: endOfMonth },
      categoryId: { not: null },
      deletedAt: null,
    },
    _sum: { netPaid: true },
  });

  // Fetch category names
  const categoryIds = expenseByCategory.map((item) => item.categoryId).filter(Boolean) as string[];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

  let total = 0;
  for (const item of expenseByCategory) {
    total += Number(item._sum.netPaid || 0);
  }

  const chartData = expenseByCategory
    .filter((item) => item.categoryId)
    .map((item) => {
      const value = Number(item._sum.netPaid) || 0;
      return {
        name: categoryMap.get(item.categoryId!) || "ไม่ระบุ",
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
