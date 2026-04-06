import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { formatCurrency, calculateVATSummary, calculateWHTSummary } from "@/lib/utils/tax-calculator";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Calculator,
  FileText,
} from "lucide-react";

type ViewMode = "official" | "internal";

interface ReportKpiRibbonProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

function MomBadge({ change, positiveIsGood }: { change: number; positiveIsGood: boolean }) {
  if (change === 0) return null;
  const isGood = positiveIsGood ? change > 0 : change < 0;
  const isUp = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
      }`}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}

export async function ReportKpiRibbon({
  companyCode,
  year,
  month,
  viewMode = "internal",
}: ReportKpiRibbonProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const { startDate, endDate } = getThaiMonthRange(year, month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { startDate: prevStart, endDate: prevEnd } = getThaiMonthRange(prevYear, prevMonth);

  const baseWhere = buildExpenseWhereForMode(company.id, viewMode);
  const expenseWhere = (start: Date, end: Date) => ({
    ...baseWhere,
    billDate: { gte: start, lte: end },
  });
  const incomeWhere = (start: Date, end: Date) => ({
    ...buildIncomeBaseWhere(company.id),
    receiveDate: { gte: start, lte: end },
  });

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
      where: expenseWhere(startDate, endDate),
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.income.aggregate({
      where: incomeWhere(startDate, endDate),
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: expenseWhere(prevStart, prevEnd),
      _sum: { netPaid: true },
    }),
    prisma.income.aggregate({
      where: incomeWhere(prevStart, prevEnd),
      _sum: { netReceived: true },
    }),
    prisma.expense.findMany({
      where: { ...expenseWhere(startDate, endDate), vatRate: { gt: 0 } },
      select: { vatAmount: true },
    }),
    prisma.income.findMany({
      where: { ...incomeWhere(startDate, endDate), vatRate: { gt: 0 } },
      select: { vatAmount: true },
    }),
    prisma.expense.findMany({
      where: { ...expenseWhere(startDate, endDate), isWht: true },
      select: { whtAmount: true },
    }),
    prisma.income.findMany({
      where: { ...incomeWhere(startDate, endDate), isWhtDeducted: true },
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Income */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          รายรับรวม
        </div>
        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(totalIncome)}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{incomeSum._count} รายการ</span>
          {prevIncome > 0 && <MomBadge change={incomeChange} positiveIsGood={true} />}
        </div>
      </div>

      {/* Expense */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          รายจ่ายรวม
        </div>
        <div className="text-xl font-bold text-red-600 dark:text-red-400">
          {formatCurrency(totalExpense)}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{expenseSum._count} รายการ</span>
          {prevExpense > 0 && <MomBadge change={expenseChange} positiveIsGood={false} />}
        </div>
      </div>

      {/* Net P&L */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-blue-500" />
          กำไร / ขาดทุนสุทธิ
        </div>
        <div
          className={`text-xl font-bold ${
            netPL >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {netPL >= 0 ? "+" : ""}
          {formatCurrency(netPL)}
        </div>
        <div className="text-xs text-muted-foreground">รายรับ - รายจ่าย</div>
      </div>

      {/* Tax */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calculator className="h-3.5 w-3.5 text-orange-500" />
          ภาษี
        </div>
        <div className="flex gap-4 mt-1">
          <div>
            <div className="text-[10px] text-muted-foreground">VAT สุทธิ</div>
            <div
              className={`text-sm font-semibold ${
                vatSummary.netVAT >= 0
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {vatSummary.netVAT >= 0 ? "จ่าย " : "คืน "}
              {formatCurrency(Math.abs(vatSummary.netVAT))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <FileText className="h-3 w-3 text-purple-500" />
              WHT นำส่ง
            </div>
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {formatCurrency(whtSummary.whtPaid)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
