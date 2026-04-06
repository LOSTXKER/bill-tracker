import Link from "next/link";
import { prisma } from "@/lib/db";
import { buildExpenseWhereForMode, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import { getThaiMonthRange } from "@/lib/queries/date-utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Scale } from "lucide-react";
import { formatCurrency, calculateWHTSummary } from "@/lib/utils/tax-calculator";

type ViewMode = "official" | "internal";

interface WHTReportProps {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}

export async function WHTReport({
  companyCode,
  year,
  month,
  viewMode = "official",
}: WHTReportProps) {
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
        isWht: true,
      },
      include: {
        Contact: { select: { name: true, taxId: true } },
      },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        ...buildIncomeBaseWhere(company.id),
        receiveDate: { gte: startDate, lte: endDate },
        isWhtDeducted: true,
      },
      include: {
        Contact: { select: { name: true, taxId: true } },
      },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const summary = calculateWHTSummary(
    expenses.map((e) => ({ whtAmount: e.whtAmount ? Number(e.whtAmount) : null })),
    incomes.map((i) => ({ whtAmount: i.whtAmount ? Number(i.whtAmount) : null }))
  );

  return (
    <div className="space-y-4">
      {/* WHT Paid Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <FileText className="h-4 w-4 text-red-500 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">หัก ณ ที่จ่ายจากผู้ขาย</h3>
          <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(summary.whtPaid)}
          </span>
        </div>
        <p className="px-4 py-2 text-xs text-muted-foreground border-b">
          รายการที่ต้องนำส่งสรรพากร (ภ.ง.ด.53)
        </p>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ขาย</TableHead>
                  <TableHead className="text-muted-foreground font-medium">เลขประจำตัวผู้เสียภาษี</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอด</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-center">อัตรา</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ภาษีหัก</TableHead>
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
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{expense.Contact?.name || expense.description || "-"}</div>
                      {expense.description && expense.Contact?.name && (
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{expense.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {expense.Contact?.taxId || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-center">{Number(expense.whtRate)}%</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(Number(expense.whtAmount) || 0)}
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
                  <TableCell />
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(summary.whtPaid)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>

      {/* Net WHT banner */}
      <div className="flex items-center gap-4 rounded-lg border px-4 py-3 bg-muted/30">
        <Scale className="h-4 w-4 text-purple-500 shrink-0" />
        <span className="text-sm font-medium text-foreground">สุทธิ WHT ที่ต้องนำส่ง</span>
        <span className="text-base font-bold text-purple-600 dark:text-purple-400">
          {formatCurrency(summary.netWHT)}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          หักจากผู้ขาย {formatCurrency(summary.whtPaid)} − เครดิตจากลูกค้า {formatCurrency(summary.whtReceived)}
        </span>
      </div>

      {/* WHT Received Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
          <h3 className="text-sm font-semibold text-foreground">โดนหัก ณ ที่จ่ายจากลูกค้า</h3>
          <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.whtReceived)}
          </span>
        </div>
        <p className="px-4 py-2 text-xs text-muted-foreground border-b">
          ใช้เป็นเครดิตภาษี (ต้องได้รับใบ 50 ทวิ)
        </p>
        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ลูกค้า</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอด</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-center">อัตรา</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ภาษีโดนหัก</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-center">ใบ 50 ทวิ</TableHead>
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
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{income.Contact?.name || income.source || "-"}</div>
                      {income.source && income.Contact?.name && (
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{income.source}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-center">{Number(income.whtRate)}%</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(Number(income.whtAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center relative">
                      {income.whtCertUrls && (income.whtCertUrls as string[]).length > 0 ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          ได้รับแล้ว
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          รอทวง
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-sm font-semibold">
                    รวม {incomes.length} รายการ
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(incomes.reduce((s, i) => s + Number(i.amount), 0))}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {formatCurrency(summary.whtReceived)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
