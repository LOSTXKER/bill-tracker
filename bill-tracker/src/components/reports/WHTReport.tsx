import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
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
        isWht: true,
        deletedAt: null,
      },
      include: { Company: true, InternalCompany: true },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        isWhtDeducted: true,
        deletedAt: null,
      },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const summary = calculateWHTSummary(
    expenses.map((e) => ({ whtAmount: e.whtAmount ? Number(e.whtAmount) : null })),
    incomes.map((i) => ({ whtAmount: i.whtAmount ? Number(i.whtAmount) : null }))
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              หักจากผู้ขาย (ต้องนำส่ง)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.whtPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} รายการ - ยื่น ภ.ง.ด.53
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              โดนหักจากลูกค้า (เครดิตภาษี)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(summary.whtReceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{incomes.length} รายการ</p>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">สุทธิ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary.netWHT)}
            </div>
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

      {/* WHT Paid Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <FileText className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-foreground">หัก ณ ที่จ่ายจากผู้ขาย</h3>
          <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
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
                  <Link
                    key={expense.id}
                    href={`/${companyCode}/expenses/${expense.id}`}
                    className="table-row hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-center">{Number(expense.whtRate)}%</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(Number(expense.whtAmount) || 0)}
                    </TableCell>
                  </Link>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* WHT Received Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <FileText className="h-5 w-5 text-green-500" />
          <h3 className="text-sm font-semibold text-foreground">โดนหัก ณ ที่จ่ายจากลูกค้า</h3>
          <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
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
                  <Link
                    key={income.id}
                    href={`/${companyCode}/incomes/${income.id}`}
                    className="table-row hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="whitespace-nowrap">
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{income.source || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-center">{Number(income.whtRate)}%</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(Number(income.whtAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
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
