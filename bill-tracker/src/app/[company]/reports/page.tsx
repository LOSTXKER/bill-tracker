import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Calculator,
} from "lucide-react";
import { formatCurrency, calculateVATSummary, calculateWHTSummary } from "@/lib/utils/tax-calculator";
import Link from "next/link";

interface ReportsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { company: companyCode } = await params;
  const { month, year } = await searchParams;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const selectedYear = year ? parseInt(year) : currentYear;
  const selectedMonth = month ? parseInt(month) : currentMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            รายงาน
          </h1>
          <p className="text-muted-foreground">
            รายงานภาษีและสรุปรายรับ-รายจ่าย
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue={selectedMonth.toString()}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2000, i).toLocaleDateString("th-TH", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue={selectedYear.toString()}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={i} value={(currentYear - i).toString()}>
                  {currentYear - i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="vat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="vat" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">VAT</span>
          </TabsTrigger>
          <TabsTrigger value="wht" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">หัก ณ ที่จ่าย</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">สรุป</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vat">
          <Suspense fallback={<ReportSkeleton />}>
            <VATReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="wht">
          <Suspense fallback={<ReportSkeleton />}>
            <WHTReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="summary">
          <Suspense fallback={<ReportSkeleton />}>
            <MonthlySummary
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function VATReport({
  companyCode,
  year,
  month,
}: {
  companyCode: string;
  year: number;
  month: number;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        companyId: company.id,
        billDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
      },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        vatRate: { gt: 0 },
      },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const summary = calculateVATSummary(
    expenses.map((e: typeof expenses[number]) => ({ vatAmount: e.vatAmount ? Number(e.vatAmount) : null })),
    incomes.map((i: typeof incomes[number]) => ({ vatAmount: i.vatAmount ? Number(i.vatAmount) : null }))
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
          className={`${
            summary.netVAT >= 0
              ? "border-red-200/50 dark:border-red-800/50"
              : "border-primary/50 bg-primary/10"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {summary.netVAT >= 0 ? "ต้องชำระ" : "ขอคืน"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.netVAT >= 0 ? "text-red-600 dark:text-red-400" : "text-primary"
              }`}
            >
              {formatCurrency(Math.abs(summary.netVAT))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              สำหรับยื่น ภ.พ.30
            </p>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            รายการภาษีซื้อ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการภาษีซื้อในเดือนนี้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>เลขที่ใบกำกับ</TableHead>
                  <TableHead>ผู้ขาย</TableHead>
                  <TableHead className="text-right">ยอดก่อน VAT</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: typeof expenses[number]) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{expense.invoiceNumber || "-"}</TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(Number(expense.vatAmount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Output VAT Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            รายการภาษีขาย
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการภาษีขายในเดือนนี้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>เลขที่ใบกำกับ</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">ยอดก่อน VAT</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income: typeof incomes[number]) => (
                  <TableRow key={income.id}>
                    <TableCell>
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{income.invoiceNumber || "-"}</TableCell>
                    <TableCell>{income.source || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(Number(income.vatAmount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function WHTReport({
  companyCode,
  year,
  month,
}: {
  companyCode: string;
  year: number;
  month: number;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: {
        companyId: company.id,
        billDate: { gte: startDate, lte: endDate },
        isWht: true,
      },
      orderBy: { billDate: "asc" },
    }),
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        isWhtDeducted: true,
      },
      orderBy: { receiveDate: "asc" },
    }),
  ]);

  const summary = calculateWHTSummary(
    expenses.map((e: typeof expenses[number]) => ({ whtAmount: e.whtAmount ? Number(e.whtAmount) : null })),
    incomes.map((i: typeof incomes[number]) => ({ whtAmount: i.whtAmount ? Number(i.whtAmount) : null }))
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
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.length} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              สุทธิ
            </CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-500" />
            หัก ณ ที่จ่ายจากผู้ขาย
          </CardTitle>
          <CardDescription>
            รายการที่ต้องนำส่งสรรพากร (ภ.ง.ด.53)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการในเดือนนี้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ผู้ขาย</TableHead>
                  <TableHead>เลขประจำตัวผู้เสียภาษี</TableHead>
                  <TableHead className="text-right">ยอด</TableHead>
                  <TableHead className="text-center">อัตรา</TableHead>
                  <TableHead className="text-right">ภาษีหัก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: typeof expenses[number]) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{expense.description || "-"}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-center">
                      {Number(expense.whtRate)}%
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(Number(expense.whtAmount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* WHT Received Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            โดนหัก ณ ที่จ่ายจากลูกค้า
          </CardTitle>
          <CardDescription>
            ใช้เป็นเครดิตภาษี (ต้องได้รับใบ 50 ทวิ)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incomes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการในเดือนนี้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">ยอด</TableHead>
                  <TableHead className="text-center">อัตรา</TableHead>
                  <TableHead className="text-right">ภาษีโดนหัก</TableHead>
                  <TableHead className="text-center">ใบ 50 ทวิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income: typeof incomes[number]) => (
                  <TableRow key={income.id}>
                    <TableCell>
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell>{income.source || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-center">
                      {Number(income.whtRate)}%
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(Number(income.whtAmount) || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {income.whtCertUrl ? (
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
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function MonthlySummary({
  companyCode,
  year,
  month,
}: {
  companyCode: string;
  year: number;
  month: number;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [expenseSum, incomeSum, expenseByCategory] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        companyId: company.id,
        billDate: { gte: startDate, lte: endDate },
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        companyId: company.id,
        billDate: { gte: startDate, lte: endDate },
      },
      _sum: { netPaid: true },
      _count: true,
    }),
  ]);

  const totalExpense = Number(expenseSum._sum.netPaid) || 0;
  const totalIncome = Number(incomeSum._sum.netReceived) || 0;
  const netCashFlow = totalIncome - totalExpense;

  const categoryLabels: Record<string, string> = {
    MATERIAL: "วัตถุดิบ",
    UTILITY: "สาธารณูปโภค",
    MARKETING: "การตลาด",
    SALARY: "เงินเดือน",
    FREELANCE: "ค่าจ้างฟรีแลนซ์",
    TRANSPORT: "ค่าขนส่ง",
    RENT: "ค่าเช่า",
    OFFICE: "สำนักงาน",
    OTHER: "อื่นๆ",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              รายรับรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {incomeSum._count} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              รายจ่ายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseSum._count} รายการ
            </p>
          </CardContent>
        </Card>

        <Card
          className={`${
            netCashFlow >= 0
              ? "border-blue-200/50 dark:border-blue-800/50"
              : "border-red-200/50 dark:border-red-800/50"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              กระแสเงินสดสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netCashFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(netCashFlow)}
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

      {/* Expense by Category */}
      <Card>
        <CardHeader>
          <CardTitle>รายจ่ายแยกตามหมวดหมู่</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการในเดือนนี้
            </p>
          ) : (
            <div className="space-y-4">
              {expenseByCategory
                .sort((a: typeof expenseByCategory[number], b: typeof expenseByCategory[number]) => (Number(b._sum.netPaid) || 0) - (Number(a._sum.netPaid) || 0))
                .map((item: typeof expenseByCategory[number]) => {
                  const amount = Number(item._sum.netPaid) || 0;
                  const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                  return (
                    <div key={item.category || "null"} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {item.category ? categoryLabels[item.category] || item.category : "ไม่ระบุ"}
                        </span>
                        <span>{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item._count} รายการ</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
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
      <div className="grid gap-4 sm:grid-cols-3">
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
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
