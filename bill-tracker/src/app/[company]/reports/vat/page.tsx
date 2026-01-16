import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface VATReportPageProps {
  params: Promise<{ company: string }>;
}

export default async function VATReportPage({ params }: VATReportPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            รายงานภาษีมูลค่าเพิ่ม (VAT)
          </h1>
          <p className="text-muted-foreground">
            สรุปภาษีซื้อ-ภาษีขายสำหรับยื่น ภ.พ.30
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Report */}
      <Suspense fallback={<ReportSkeleton />}>
        <VATReport companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

async function VATReport({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get expenses with VAT (Input VAT - ภาษีซื้อ)
  const expensesRaw = await prisma.expense.findMany({
    where: {
      companyId: company.id,
      billDate: { gte: startOfMonth, lte: endOfMonth },
      vatRate: { gt: 0 },
    },
    orderBy: { billDate: "asc" },
    include: {
      Contact: true,
    },
  });
  const expenses = expensesRaw.map((e) => ({ ...e, contact: e.Contact }));

  // Get incomes with VAT (Output VAT - ภาษีขาย)
  const incomesRaw = await prisma.income.findMany({
    where: {
      companyId: company.id,
      receiveDate: { gte: startOfMonth, lte: endOfMonth },
      vatRate: { gt: 0 },
    },
    orderBy: { receiveDate: "asc" },
    include: {
      Contact: true,
    },
  });
  const incomes = incomesRaw.map((i) => ({ ...i, contact: i.Contact }));

  // Calculate totals
  const inputVAT = expenses.reduce(
    (sum: number, e: typeof expenses[number]) => sum + Number(e.vatAmount || 0),
    0
  );
  const outputVAT = incomes.reduce(
    (sum: number, i: typeof incomes[number]) => sum + Number(i.vatAmount || 0),
    0
  );
  const netVAT = outputVAT - inputVAT;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีซื้อ (Input VAT)
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(inputVAT)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีขาย (Output VAT)
            </CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(outputVAT)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{incomes.length} รายการ</p>
          </CardContent>
        </Card>

        <Card
          className={
            netVAT > 0
              ? "border-red-200/50 dark:border-red-800/50"
              : "border-primary/50 bg-primary/10"
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ภาษีสุทธิ (Net VAT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netVAT > 0 ? "text-red-600 dark:text-red-400" : "text-primary"
              }`}
            >
              {formatCurrency(Math.abs(netVAT))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {netVAT > 0 ? "ต้องนำส่ง" : "ขอคืน"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Input VAT Table */}
      <Card>
        <CardHeader>
          <CardTitle>ภาษีซื้อ (Input VAT)</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ผู้ขาย</TableHead>
                    <TableHead className="text-right">มูลค่าสินค้า</TableHead>
                    <TableHead className="text-right">VAT 7%</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: typeof expenses[number]) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(expense.billDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {expense.contact?.name || expense.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(Number(expense.vatAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          Number(expense.amount) + Number(expense.vatAmount || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3}>รวมภาษีซื้อ</TableCell>
                    <TableCell className="text-right text-blue-600 dark:text-blue-400">
                      {formatCurrency(inputVAT)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output VAT Table */}
      <Card>
        <CardHeader>
          <CardTitle>ภาษีขาย (Output VAT)</CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead className="text-right">มูลค่าสินค้า</TableHead>
                    <TableHead className="text-right">VAT 7%</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.map((income: typeof incomes[number]) => (
                    <TableRow key={income.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(income.receiveDate).toLocaleDateString(
                          "th-TH",
                          {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        {income.contact?.name || income.source || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(income.amount))}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        {formatCurrency(Number(income.vatAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          Number(income.amount) + Number(income.vatAmount || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3}>รวมภาษีขาย</TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(outputVAT)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
