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
import { ReportDateSelector } from "@/components/reports/ReportDateSelector";
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Calculator,
} from "lucide-react";
import { formatCurrency, calculateVATSummary, calculateWHTSummary } from "@/lib/utils/tax-calculator";
import { ViewModeToggle } from "@/components/dashboard";

interface ReportsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string; year?: string; viewMode?: string }>;
}

type ViewMode = "official" | "internal";

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { company: companyCode } = await params;
  const { month, year, viewMode: viewModeParam } = await searchParams;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const selectedYear = year ? parseInt(year) : currentYear;
  const selectedMonth = month ? parseInt(month) : currentMonth;
  const viewMode: ViewMode = (viewModeParam as ViewMode) || "official";

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ViewModeToggle companyCode={companyCode} currentMode={viewMode} />
          <ReportDateSelector
            companyCode={companyCode}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
          />
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
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="wht">
          <Suspense fallback={<ReportSkeleton />}>
            <WHTReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="summary">
          <Suspense fallback={<ReportSkeleton />}>
            <MonthlySummary
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
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
  viewMode = "official",
}: {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Build company filter based on viewMode
  // Official: what we recorded in our books
  // Internal: actual ownership (internalCompanyId or default to companyId if null)
  const expenseCompanyFilter = viewMode === "internal"
    ? {
        OR: [
          { internalCompanyId: company.id },
          { companyId: company.id, internalCompanyId: null },
        ]
      }
    : { companyId: company.id };

  // Get expenses and incomes with VAT only
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
    // Income doesn't have internalCompanyId yet, always filter by companyId
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
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">รายการภาษีซื้อ</h3>
            <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
          </div>
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
                {expenses.map((expense: typeof expenses[number]) => (
                  <TableRow key={expense.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Output VAT Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">รายการภาษีขาย</h3>
            <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
          </div>
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
                {incomes.map((income: typeof incomes[number]) => (
                  <TableRow key={income.id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

async function WHTReport({
  companyCode,
  year,
  month,
  viewMode = "official",
}: {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Build company filter based on viewMode
  // Official: what we recorded in our books
  // Internal: actual ownership (internalCompanyId or default to companyId if null)
  const expenseCompanyFilter = viewMode === "internal"
    ? {
        OR: [
          { internalCompanyId: company.id },
          { companyId: company.id, internalCompanyId: null },
        ]
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
    // Income doesn't have internalCompanyId yet
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
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">หัก ณ ที่จ่ายจากผู้ขาย</h3>
            <span className="text-xs text-muted-foreground">({expenses.length} รายการ)</span>
          </div>
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
          </div>
        )}
      </div>

      {/* WHT Received Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">โดนหัก ณ ที่จ่ายจากลูกค้า</h3>
            <span className="text-xs text-muted-foreground">({incomes.length} รายการ)</span>
          </div>
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
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

async function MonthlySummary({
  companyCode,
  year,
  month,
  viewMode = "official",
}: {
  companyCode: string;
  year: number;
  month: number;
  viewMode?: ViewMode;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Build company filter based on viewMode
  // Official: what we recorded in our books
  // Internal: actual ownership (internalCompanyId or default to companyId if null)
  const expenseCompanyFilter = viewMode === "internal"
    ? {
        OR: [
          { internalCompanyId: company.id },
          { companyId: company.id, internalCompanyId: null },
        ]
      }
    : { companyId: company.id };

  const [expenseSum, incomeSum, expenseByAccount, accounts, allExpenses, allIncomes] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    // Income doesn't have internalCompanyId yet
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netReceived: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ["accountId"],
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    prisma.account.findMany({
      where: { companyId: company.id },
      select: { id: true, code: true, name: true },
    }),
    // Get all expenses for transaction list
    prisma.expense.findMany({
      where: {
        ...expenseCompanyFilter,
        billDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { Contact: true, Account: true },
      orderBy: { billDate: "desc" },
      take: 50, // Limit to 50 most recent
    }),
    // Get all incomes for transaction list
    prisma.income.findMany({
      where: {
        companyId: company.id,
        receiveDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: { Contact: true },
      orderBy: { receiveDate: "desc" },
      take: 50, // Limit to 50 most recent
    }),
  ]);
  
  // Create account lookup map
  const accountMap = new Map(accounts.map(a => [a.id, a]));

  const totalExpense = Number(expenseSum._sum.netPaid) || 0;
  const totalIncome = Number(incomeSum._sum.netReceived) || 0;
  const netCashFlow = totalIncome - totalExpense;

  // Helper function to get account name
  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "ไม่ระบุบัญชี";
    const account = accountMap.get(accountId);
    return account ? `${account.code} - ${account.name}` : "ไม่ระบุบัญชี";
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

      {/* Expense by Account */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">รายจ่ายแยกตามบัญชี</h3>
        </div>
        <CardContent className="pt-4">
          {expenseByAccount.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              ไม่มีรายการในเดือนนี้
            </p>
          ) : (
            <div className="space-y-4">
              {expenseByAccount
                .sort((a, b) => (Number(b._sum?.netPaid) || 0) - (Number(a._sum?.netPaid) || 0))
                .map((item) => {
                  const amount = Number(item._sum?.netPaid) || 0;
                  const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                  return (
                    <div key={item.accountId || "null"} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {getAccountName(item.accountId)}
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
      </div>

      {/* All Expenses Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">รายจ่ายทั้งหมด</h3>
            <span className="text-xs text-muted-foreground">({allExpenses.length} รายการล่าสุด)</span>
          </div>
        </div>
        {allExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ผู้ขาย</TableHead>
                  <TableHead className="text-muted-foreground font-medium">บัญชี</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดเงิน</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {expense.billDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {expense.Contact?.name || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {expense.Account ? `${expense.Account.code} - ${expense.Account.name}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(expense.vatAmount) > 0 ? formatCurrency(Number(expense.vatAmount)) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(Number(expense.netPaid))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* All Incomes Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">รายรับทั้งหมด</h3>
            <span className="text-xs text-muted-foreground">({allIncomes.length} รายการล่าสุด)</span>
          </div>
        </div>
        {allIncomes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">ไม่มีรายการในเดือนนี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">วันที่</TableHead>
                  <TableHead className="text-muted-foreground font-medium">รายละเอียด</TableHead>
                  <TableHead className="text-muted-foreground font-medium">ลูกค้า</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">ยอดเงิน</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">VAT</TableHead>
                  <TableHead className="text-muted-foreground font-medium text-right">สุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="whitespace-nowrap">
                      {income.receiveDate.toLocaleDateString("th-TH")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {income.source || "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {income.Contact?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(income.amount))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(income.vatAmount) > 0 ? formatCurrency(Number(income.vatAmount)) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(Number(income.netReceived))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
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
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
