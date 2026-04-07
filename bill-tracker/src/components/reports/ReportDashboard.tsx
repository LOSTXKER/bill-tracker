import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { getMonthlyChartData } from "@/lib/cache/chart-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueExpenseTrendChart } from "@/components/reports/charts/RevenueExpenseTrendChart";
import { CategoryList } from "@/components/reports/CategoryList";

type ViewMode = "official" | "internal";

interface ReportDashboardProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

export async function ReportDashboard({
  companyCode,
  year,
  month,
  viewMode = "internal",
}: ReportDashboardProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const { startDate, endDate } = getThaiMonthRange(year, month);
  const expenseWhere = {
    ...buildExpenseWhereForMode(company.id, viewMode),
    billDate: { gte: startDate, lte: endDate },
  };
  const incomeWhere = {
    ...buildIncomeBaseWhere(company.id),
    receiveDate: { gte: startDate, lte: endDate },
  };

  const [
    trendData,
    expenseByCategory,
    incomeByCategory,
    categories,
    allExpenseRows,
  ] = await Promise.all([
    getMonthlyChartData(company.id, 6),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: expenseWhere,
      _sum: { netPaid: true },
      _count: true,
      orderBy: { _sum: { netPaid: "desc" } },
    }),
    prisma.income.groupBy({
      by: ["categoryId"],
      where: incomeWhere,
      _sum: { netReceived: true },
      _count: true,
      orderBy: { _sum: { netReceived: "desc" } },
    }),
    prisma.transactionCategory.findMany({
      where: {
        OR: [
          { companyId: company.id },
          { Expenses: { some: expenseWhere } },
          { Incomes: { some: incomeWhere } },
        ],
      },
      select: { id: true, name: true, parentId: true, Parent: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        billDate: true,
        description: true,
        amount: true,
        vatAmount: true,
        netPaid: true,
        Contact: { select: { name: true } },
        Category: { select: { id: true, name: true, Parent: { select: { name: true } } } },
        Company: { select: { code: true } },
      },
      orderBy: { billDate: "desc" },
    }),
  ]);

  const getCategoryDisplayName = (categoryId: string | null) => {
    if (!categoryId) return "ไม่ระบุหมวดหมู่";
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? (cat.Parent ? `[${cat.Parent.name}] ${cat.name}` : cat.name) : "ไม่ระบุหมวดหมู่";
  };

  const expenseCategoryGroups = expenseByCategory
    .sort((a, b) => (Number(b._sum?.netPaid) || 0) - (Number(a._sum?.netPaid) || 0))
    .map((item) => ({
      categoryId: item.categoryId,
      categoryName: getCategoryDisplayName(item.categoryId),
      total: Number(item._sum?.netPaid) || 0,
      count: item._count,
    }));
  const totalExpense = expenseCategoryGroups.reduce((s, g) => s + g.total, 0);

  const incomeCategoryGroups = incomeByCategory
    .sort((a, b) => (Number(b._sum?.netReceived) || 0) - (Number(a._sum?.netReceived) || 0))
    .map((item) => ({
      categoryId: item.categoryId,
      categoryName: getCategoryDisplayName(item.categoryId),
      total: Number(item._sum?.netReceived) || 0,
      count: item._count,
    }));
  const totalIncome = incomeCategoryGroups.reduce((s, g) => s + g.total, 0);

  const expenseRows = allExpenseRows.map((e) => ({
    id: e.id,
    billDate: e.billDate.toISOString(),
    description: e.description,
    amount: Number(e.amount),
    vatAmount: Number(e.vatAmount) || 0,
    netPaid: Number(e.netPaid),
    contactName: e.Contact?.name ?? null,
    categoryName: e.Category
      ? e.Category.Parent
        ? `[${e.Category.Parent.name}] ${e.Category.name}`
        : e.Category.name
      : null,
    payerCompanyCode: e.Company?.code !== companyCode.toUpperCase() ? e.Company?.code ?? null : null,
  }));

  const chartTrendData = trendData.map(({ month: m, income, expense }) => ({
    month: m,
    income,
    expense,
  }));

  return (
    <div>
      {/* Trend chart — full width */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">แนวโน้มรายรับ-รายจ่าย (6 เดือน)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px]">
            <RevenueExpenseTrendChart data={chartTrendData} />
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t pt-6">
        <CategoryList
          type="expense"
          title="รายจ่ายตามหมวดหมู่"
          groups={expenseCategoryGroups}
          total={totalExpense}
          allExpenses={expenseRows}
          companyCode={companyCode}
          year={year}
          month={month}
        />
        <CategoryList
          type="income"
          title="รายรับตามหมวดหมู่"
          groups={incomeCategoryGroups}
          total={totalIncome}
          companyCode={companyCode}
          year={year}
          month={month}
        />
      </div>
    </div>
  );
}
