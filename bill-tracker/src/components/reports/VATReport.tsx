import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { getThaiMonthRange, APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { formatCurrency, calculateVATSummary } from "@/lib/utils/tax-calculator";

type ViewMode = "official" | "internal";

interface VATReportProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

export async function VATReport({
  companyCode,
  year,
  month,
  viewMode = "official",
}: VATReportProps) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const { startDate, endDate } = getThaiMonthRange(year, month);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...buildExpenseWhereForMode(company.id, viewMode),
        billDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
      },
      include: { Company: true, InternalCompany: true, Contact: true },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(company.id),
        receiveDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
      },
      include: { Contact: true },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const summary = calculateVATSummary(
    expenses.map((e) => ({ vatAmount: e.vatAmount ? Number(e.vatAmount) : null })),
    incomes.map((i) => ({ vatAmount: i.vatAmount ? Number(i.vatAmount) : null }))
  );

  return (
    <div className="space-y-4">
      {/* Input VAT Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingDown className="h-4 w-4 text-blue-500 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">รายการภาษีซื้อ</h3>
          <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(summary.inputVAT)}
          </span>
        </div>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการภาษีซื้อในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ติดต่อ</TableHead>
                  <TableHead className="text-muted-foreground font-medium">คำอธิบายรายการ</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดก่อน VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/${companyCode}/expenses/${expense.id}`} className="absolute inset-0" tabIndex={-1} />
                      {expense.billDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE })}
                    </TableCell>
                    <TableCell>
                      {expense.Contact?.name ? (
                        <span className="font-medium">{expense.Contact.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(Number(expense.vatAmount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-sm font-semibold">
                    รวม {expenses.length} รายการ
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    {formatCurrency(summary.inputVAT)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>

      {/* Net VAT banner */}
      <div
        className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
          summary.netVAT >= 0
            ? "border-red-200/70 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/20"
            : "border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20"
        }`}
      >
        <Receipt
          className={`h-4 w-4 shrink-0 ${
            summary.netVAT >= 0 ? "text-red-500" : "text-emerald-500"
          }`}
        />
        <span className="text-sm font-medium text-foreground">
          {summary.netVAT >= 0 ? "VAT ที่ต้องชำระ" : "VAT ที่ขอคืนได้"}
        </span>
        <span
          className={`text-base font-bold ${
            summary.netVAT >= 0
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatCurrency(Math.abs(summary.netVAT))}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          ภาษีซื้อ {formatCurrency(summary.inputVAT)} − ภาษีขาย {formatCurrency(summary.outputVAT)} · สำหรับยื่น ภ.พ.30
        </span>
      </div>

      {/* Output VAT Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">รายการภาษีขาย</h3>
          <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(summary.outputVAT)}
          </span>
        </div>
        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการภาษีขายในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ติดต่อ</TableHead>
                  <TableHead className="text-muted-foreground font-medium">คำอธิบายรายการ</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดก่อน VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow
                    key={income.id}
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/${companyCode}/incomes/${income.id}`} className="absolute inset-0" tabIndex={-1} />
                      {income.receiveDate.toLocaleDateString(APP_LOCALE, { timeZone: APP_TIMEZONE })}
                    </TableCell>
                    <TableCell>
                      {income.Contact?.name ? (
                        <span className="font-medium">{income.Contact.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {income.source || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(Number(income.vatAmount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-sm font-semibold">
                    รวม {incomes.length} รายการ
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(incomes.reduce((s, i) => s + Number(i.amount), 0))}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatCurrency(summary.outputVAT)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
