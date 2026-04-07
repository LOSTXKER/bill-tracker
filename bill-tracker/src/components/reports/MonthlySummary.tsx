import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { MonthlySummaryContent } from "./MonthlySummaryContent";

type ViewMode = "official" | "internal";

interface MonthlySummaryProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

export async function MonthlySummary({
  companyCode,
  year,
  month,
  viewMode = "official",
}: MonthlySummaryProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const { startDate, endDate } = getThaiMonthRange(year, month);

  const [allExpenses, allIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...buildExpenseWhereForMode(company.id, viewMode),
        billDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        billDate: true,
        description: true,
        amount: true,
        vatAmount: true,
        netPaid: true,
        Contact: { select: { name: true } },
        Category: {
          select: { id: true, name: true, Parent: { select: { name: true } } },
        },
        Company: { select: { code: true } },
      },
      orderBy: { billDate: "desc" },
    }),
    prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(company.id),
        receiveDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        receiveDate: true,
        source: true,
        amount: true,
        vatAmount: true,
        netReceived: true,
        Contact: { select: { name: true } },
      },
      orderBy: { receiveDate: "desc" },
    }),
  ]);

  const expenseRows = allExpenses.map((e) => ({
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

  const incomeRows = allIncomes.map((i) => ({
    id: i.id,
    receiveDate: i.receiveDate.toISOString(),
    source: i.source,
    amount: Number(i.amount),
    vatAmount: Number(i.vatAmount) || 0,
    netReceived: Number(i.netReceived),
    contactName: i.Contact?.name ?? null,
  }));

  return (
    <MonthlySummaryContent
      companyCode={companyCode}
      year={year}
      month={month}
      allExpenses={expenseRows}
      allIncomes={incomeRows}
    />
  );
}
