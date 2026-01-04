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
import { FileText, Download, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface WHTReportPageProps {
  params: Promise<{ company: string }>;
}

export default async function WHTReportPage({ params }: WHTReportPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            รายงานภาษีหัก ณ ที่จ่าย (WHT)
          </h1>
          <p className="text-muted-foreground">
            สรุปภาษีหักสำหรับยื่น ภ.ง.ด.53/54
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Report */}
      <Suspense fallback={<ReportSkeleton />}>
        <WHTReport companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

const WHT_TYPE_LABELS: Record<string, string> = {
  SERVICE_3: "ค่าบริการ (3%)",
  PROFESSIONAL_5: "ค่าบริการวิชาชีพ (5%)",
  TRANSPORT_1: "ค่าขนส่ง (1%)",
  RENT_5: "ค่าเช่า (5%)",
  ADVERTISING_2: "ค่าโฆษณา (2%)",
  OTHER: "อื่นๆ",
};

async function WHTReport({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get expenses with WHT (เราหักเขา - ต้องนำส่ง)
  const expensesWithWHT = await prisma.expense.findMany({
    where: {
      companyId: company.id,
      billDate: { gte: startOfMonth, lte: endOfMonth },
      isWht: true,
    },
    orderBy: { billDate: "asc" },
    include: {
      contact: true,
    },
  });

  // Get incomes with WHT deducted (เขาหักเรา - เครดิตภาษี)
  const incomesWithWHT = await prisma.income.findMany({
    where: {
      companyId: company.id,
      receiveDate: { gte: startOfMonth, lte: endOfMonth },
      isWhtDeducted: true,
    },
    orderBy: { receiveDate: "asc" },
    include: {
      contact: true,
    },
  });

  // Calculate totals
  const totalWHTpaid = expensesWithWHT.reduce(
    (sum: number, e: typeof expensesWithWHT[number]) => sum + Number(e.whtAmount || 0),
    0
  );
  const totalWHTreceived = incomesWithWHT.reduce(
    (sum: number, i: typeof incomesWithWHT[number]) => sum + Number(i.whtAmount || 0),
    0
  );

  // Group by type
  const whtByType = expensesWithWHT.reduce(
    (acc: Record<string, { count: number; amount: number }>, expense: typeof expensesWithWHT[number]) => {
      const type = expense.whtType || "OTHER";
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 };
      }
      acc[type].count += 1;
      acc[type].amount += Number(expense.whtAmount || 0);
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              เราหักเขา (ต้องนำส่ง)
            </CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalWHTpaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expensesWithWHT.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              เขาหักเรา (เครดิตภาษี)
            </CardTitle>
            <FileText className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalWHTreceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomesWithWHT.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ต้องนำส่งสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalWHTpaid - totalWHTreceived)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              หัก - {formatCurrency(totalWHTreceived)} เครดิต
            </p>
          </CardContent>
        </Card>
      </div>

      {/* WHT by Type */}
      <Card>
        <CardHeader>
          <CardTitle>สรุปตามประเภทเงินได้</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-center">จำนวนรายการ</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.entries(whtByType) as [string, { count: number; amount: number }][]).map(([type, data]) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">
                      {WHT_TYPE_LABELS[type] || type}
                    </TableCell>
                    <TableCell className="text-center">{data.count}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(data.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>รวมทั้งหมด</TableCell>
                  <TableCell className="text-center">
                    {expensesWithWHT.length}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totalWHTpaid)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* WHT Paid (เราหักเขา) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">
            รายการหัก ณ ที่จ่าย (เราหักเขา)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesWithWHT.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ผู้ขาย</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead className="text-right">มูลค่า</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-right">WHT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesWithWHT.map((expense: typeof expensesWithWHT[number]) => (
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
                      <TableCell className="text-sm">
                        {WHT_TYPE_LABELS[expense.whtType || "OTHER"]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                    <TableCell className="text-center">
                      {Number(expense.whtRate)}%
                    </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {formatCurrency(Number(expense.whtAmount || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WHT Received (เขาหักเรา) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">
            รายการที่ถูกหัก (เขาหักเรา - เครดิตภาษี)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incomesWithWHT.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead className="text-right">มูลค่า</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead className="text-right">WHT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomesWithWHT.map((income: typeof incomesWithWHT[number]) => (
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
                      <TableCell className="text-sm">
                        {WHT_TYPE_LABELS[income.whtType || "OTHER"]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(income.amount))}
                      </TableCell>
                    <TableCell className="text-center">
                      {Number(income.whtRate)}%
                    </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(Number(income.whtAmount || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
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
