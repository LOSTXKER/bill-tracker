import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Download } from "lucide-react";
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

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const expenseCompanyFilter =
    viewMode === "internal"
      ? {
          OR: [
            { internalCompanyId: company.id },
            { companyId: company.id, internalCompanyId: null },
          ],
        }
      : { companyId: company.id };

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
        deletedAt: null,
      },
      include: { Company: true, InternalCompany: true, Contact: true },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
        deletedAt: null,
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีซื้อ (Input VAT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.inputVAT)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              จากรายจ่าย {expenses.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีขาย (Output VAT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.outputVAT)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              จากรายรับ {incomes.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            summary.netVAT >= 0
              ? "border-red-200/50 dark:border-red-800/50"
              : "border-primary/50 bg-primary/10"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {summary.netVAT >= 0 ? "ต้องชำระ" : "ขอคืน"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.netVAT >= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-primary"
              }`}
            >
              {formatCurrency(Math.abs(summary.netVAT))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">สำหรับยื่น ภ.พ.30</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Input VAT Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingDown className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">รายการภาษีซื้อ</h3>
          <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
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
                  <Link
                    key={expense.id}
                    href={`/${companyCode}/expenses/${expense.id}`}
                    className="table-row hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      {expense.billDate.toLocaleDateString("th-TH")}
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
                  </Link>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Output VAT Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">รายการภาษีขาย</h3>
          <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
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
                  <Link
                    key={income.id}
                    href={`/${companyCode}/incomes/${income.id}`}
                    className="table-row hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      {income.receiveDate.toLocaleDateString("th-TH")}
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
                  </Link>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
