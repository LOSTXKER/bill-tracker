import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, calculateVATSummary, calculateWHTSummary } from "@/lib/utils/tax-calculator";
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

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
  viewMode = "official",
}: ReportDashboardProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Previous month for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
  const prevEndDate = new Date(prevYear, prevMonth, 0);

  const expenseCompanyFilter =
    viewMode === "internal"
      ? {
          OR: [
            { internalCompanyId: company.id },
            { companyId: company.id, internalCompanyId: null },
          ],
        }
      : { companyId: company.id };

  const [
    expenseSum,
    incomeSum,
    prevExpenseSum,
    prevIncomeSum,
    vatExpenses,
    vatIncomes,
    whtExpenses,
    whtIncomes,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: prevStartDate, lte: prevEndDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
    }),
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: prevStartDate, lte: prevEndDate },
        deletedAt: null,
      },
      _sum: { netReceived: true },
    }),
    // VAT data
    prisma.expense.findMany({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
        deletedAt: null,
      },
      select: { vatAmount: true },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
        deletedAt: null,
      },
      select: { vatAmount: true },
    }),
    // WHT data
    prisma.expense.findMany({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        isWht: true,
        deletedAt: null,
      },
      select: { whtAmount: true },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        isWhtDeducted: true,
        deletedAt: null,
      },
      select: { whtAmount: true },
    }),
  ]);

  const totalExpense = Number(expenseSum._sum.netPaid) || 0;
  const totalIncome = Number(incomeSum._sum.netReceived) || 0;
  const netPL = totalIncome - totalExpense;

  const prevExpense = Number(prevExpenseSum._sum.netPaid) || 0;
  const prevIncome = Number(prevIncomeSum._sum.netReceived) || 0;

  const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0;
  const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;

  const vatSummary = calculateVATSummary(
    vatExpenses.map((e) => ({ vatAmount: e.vatAmount ? Number(e.vatAmount) : null })),
    vatIncomes.map((i) => ({ vatAmount: i.vatAmount ? Number(i.vatAmount) : null }))
  );

  const whtSummary = calculateWHTSummary(
    whtExpenses.map((e) => ({ whtAmount: e.whtAmount ? Number(e.whtAmount) : null })),
    whtIncomes.map((i) => ({ whtAmount: i.whtAmount ? Number(i.whtAmount) : null }))
  );

  const thaiMonth = new Date(year, month - 1).toLocaleDateString("th-TH", { month: "long" });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        ภาพรวมเดือน {thaiMonth} {year + 543} •{" "}
        <span className="font-medium">
          {viewMode === "internal" ? "มุมมองตามจริง" : "มุมมองตามบัญชี"}
        </span>
      </p>

      {/* Main KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Income */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              รายรับรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{incomeSum._count} รายการ</span>
              {prevIncome > 0 && (
                <span
                  className={`text-xs ml-2 flex items-center gap-0.5 ${
                    incomeChange >= 0 ? "text-primary" : "text-red-500"
                  }`}
                >
                  {incomeChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(incomeChange).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense */}
        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              รายจ่ายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpense)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">{expenseSum._count} รายการ</span>
              {prevExpense > 0 && (
                <span
                  className={`text-xs ml-2 flex items-center gap-0.5 ${
                    expenseChange <= 0 ? "text-primary" : "text-red-500"
                  }`}
                >
                  {expenseChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(expenseChange).toFixed(1)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Net P&L */}
        <Card
          className={
            netPL >= 0
              ? "border-blue-200/50 dark:border-blue-800/50 sm:col-span-2 lg:col-span-1"
              : "border-red-200/50 dark:border-red-800/50 sm:col-span-2 lg:col-span-1"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Minus className="h-4 w-4" />
              กำไร / ขาดทุนสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netPL >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {netPL >= 0 ? "+" : ""}
              {formatCurrency(netPL)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              รายรับ - รายจ่าย
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* VAT */}
        <Card className={vatSummary.netVAT >= 0 ? "border-orange-200/50 dark:border-orange-800/50" : "border-primary/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-500" />
              VAT สุทธิ (ภ.พ.30)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl font-bold ${
                vatSummary.netVAT >= 0 ? "text-orange-600 dark:text-orange-400" : "text-primary"
              }`}
            >
              {vatSummary.netVAT >= 0 ? "ต้องจ่าย " : "ขอคืน "}
              {formatCurrency(Math.abs(vatSummary.netVAT))}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>ซื้อ {formatCurrency(vatSummary.inputVAT)}</span>
              <span>•</span>
              <span>ขาย {formatCurrency(vatSummary.outputVAT)}</span>
            </div>
          </CardContent>
        </Card>

        {/* WHT */}
        <Card className="border-purple-200/50 dark:border-purple-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              WHT ต้องนำส่ง (ภ.ง.ด.53)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(whtSummary.whtPaid)}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
              <span>เครดิตภาษี {formatCurrency(whtSummary.whtReceived)}</span>
              <span>•</span>
              <span>สุทธิ {formatCurrency(whtSummary.netWHT)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hint for accountant */}
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        ดูรายละเอียดภาษีและรายการทั้งหมดได้ที่ tab ด้านบน
      </div>
    </div>
  );
}
