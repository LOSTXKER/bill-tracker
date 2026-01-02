import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  Clock,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import Link from "next/link";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ExpenseCategoryChart } from "@/components/charts/expense-category-chart";
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart";

interface DashboardPageProps {
  params: Promise<{ company: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            ภาพรวมรายรับ-รายจ่ายและเอกสารที่ต้องจัดการ
          </p>
        </div>
        <Link href={`/${companyCode.toLowerCase()}/capture`}>
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
            + บันทึกรายการ
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards companyCode={companyCode} />
      </Suspense>

      {/* Action Required Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ActionSkeleton />}>
          <ActionRequired companyCode={companyCode} />
        </Suspense>

        <Suspense fallback={<ActionSkeleton />}>
          <ReadyToSend companyCode={companyCode} />
        </Suspense>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyTrendChartData companyCode={companyCode} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ExpenseCategoryChartData companyCode={companyCode} />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <CashFlowChartData companyCode={companyCode} />
      </Suspense>

      {/* Recent Transactions */}
      <Suspense fallback={<RecentSkeleton />}>
        <RecentTransactions companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

async function StatsCards({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [incomeSum, expenseSum, pendingDocs] = await Promise.all([
    prisma.income.aggregate({
      where: {
        companyId: company.id,
        receiveDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { netReceived: true },
    }),
    prisma.expense.aggregate({
      where: {
        companyId: company.id,
        billDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { netPaid: true },
    }),
    prisma.expense.count({
      where: {
        companyId: company.id,
        status: { in: ["WAITING_FOR_DOC", "PENDING_PHYSICAL"] },
      },
    }),
  ]);

  const totalIncome = Number(incomeSum._sum.netReceived) || 0;
  const totalExpense = Number(expenseSum._sum.netPaid) || 0;
  const netCashFlow = totalIncome - totalExpense;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/50 dark:border-emerald-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            รายรับเดือนนี้
          </CardTitle>
          <ArrowDownCircle className="h-5 w-5 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-200/50 dark:border-red-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            รายจ่ายเดือนนี้
          </CardTitle>
          <ArrowUpCircle className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalExpense)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200/50 dark:border-blue-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            กระแสเงินสดสุทธิ
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              netCashFlow >= 0
                ? "text-blue-600 dark:text-blue-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(netCashFlow)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-200/50 dark:border-amber-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
            เอกสารค้าง
          </CardTitle>
          <Clock className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingDocs} รายการ
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function ActionRequired({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [waitingDocs, waitingWht, waitingIssue] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id, status: "WAITING_FOR_DOC" },
      orderBy: { billDate: "asc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id, status: "WAITING_WHT_CERT" },
      orderBy: { receiveDate: "asc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id, status: "WAITING_ISSUE" },
      orderBy: { receiveDate: "asc" },
      take: 5,
    }),
  ]);

  const hasItems =
    waitingDocs.length > 0 || waitingWht.length > 0 || waitingIssue.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          ด่วน! ต้องจัดการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ไม่มีรายการที่ต้องจัดการ
          </p>
        ) : (
          <div className="space-y-4">
            {waitingDocs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  รอใบเสร็จจากร้านค้า ({waitingDocs.length})
                </p>
                <div className="space-y-2">
                  {waitingDocs.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {expense.vendorName || expense.description || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(Number(expense.netPaid))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        รอบิล
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingWht.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  รอใบ 50 ทวิ จากลูกค้า ({waitingWht.length})
                </p>
                <div className="space-y-2">
                  {waitingWht.map((income) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {income.customerName || income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        รอใบ 50 ทวิ
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingIssue.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  รอออกบิลให้ลูกค้า ({waitingIssue.length})
                </p>
                <div className="space-y-2">
                  {waitingIssue.map((income) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {income.customerName || income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        รอออกบิล
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function ReadyToSend({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [pendingExpenses, pendingIncomes] = await Promise.all([
    prisma.expense.count({
      where: {
        companyId: company.id,
        status: { in: ["PENDING_PHYSICAL", "READY_TO_SEND"] },
      },
    }),
    prisma.income.count({
      where: {
        companyId: company.id,
        status: "PENDING_COPY_SEND",
      },
    }),
  ]);

  const total = pendingExpenses + pendingIncomes;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <FileCheck className="h-5 w-5" />
          รอส่งบัญชี
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ไม่มีเอกสารรอส่ง
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                ใบเสร็จรายจ่าย
              </span>
              <Badge>{pendingExpenses} รายการ</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                สำเนาบิลขาย
              </span>
              <Badge>{pendingIncomes} รายการ</Badge>
            </div>
            <Button variant="outline" className="w-full mt-4">
              ทำเครื่องหมายว่าส่งแล้ว
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function RecentTransactions({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [recentExpenses, recentIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const combined = [
    ...recentExpenses.map((e) => ({ ...e, type: "expense" as const })),
    ...recentIncomes.map((i) => ({ ...i, type: "income" as const })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ยังไม่มีรายการ
          </p>
        ) : (
          <div className="space-y-3">
            {combined.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      item.type === "income"
                        ? "bg-emerald-100 dark:bg-emerald-900"
                        : "bg-red-100 dark:bg-red-900"
                    }`}
                  >
                    {item.type === "income" ? (
                      <ArrowDownCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.type === "expense"
                        ? (item as (typeof recentExpenses)[0]).vendorName ||
                          (item as (typeof recentExpenses)[0]).description ||
                          "ไม่ระบุ"
                        : (item as (typeof recentIncomes)[0]).customerName ||
                          (item as (typeof recentIncomes)[0]).source ||
                          "ไม่ระบุ"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    item.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(
                    Number(
                      item.type === "expense"
                        ? (item as (typeof recentExpenses)[0]).netPaid
                        : (item as (typeof recentIncomes)[0]).netReceived
                    )
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Skeletons
function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
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
  );
}

function ActionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

async function CashFlowChartData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.income.aggregate({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
        },
        _sum: { netReceived: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId: company.id,
          billDate: { gte: startDate, lte: endDate },
        },
        _sum: { netPaid: true },
      }),
    ]);

    const income = Number(incomeSum._sum.netReceived) || 0;
    const expense = Number(expenseSum._sum.netPaid) || 0;

    months.push({
      month: monthDate.toLocaleDateString("th-TH", {
        month: "short",
        year: "2-digit",
      }),
      income,
      expense,
      netFlow: income - expense,
    });
  }

  return <CashFlowChart data={months} />;
}

async function MonthlyTrendChartData({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const [incomeSum, expenseSum] = await Promise.all([
      prisma.income.aggregate({
        where: {
          companyId: company.id,
          receiveDate: { gte: startDate, lte: endDate },
        },
        _sum: { netReceived: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId: company.id,
          billDate: { gte: startDate, lte: endDate },
        },
        _sum: { netPaid: true },
      }),
    ]);

    months.push({
      month: monthDate.toLocaleDateString("th-TH", { month: "short" }),
      income: Number(incomeSum._sum.netReceived) || 0,
      expense: Number(expenseSum._sum.netPaid) || 0,
    });
  }

  return <MonthlyTrendChart data={months} />;
}

async function ExpenseCategoryChartData({
  companyCode,
}: {
  companyCode: string;
}) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenseByCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      companyId: company.id,
      billDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { netPaid: true },
  });

  const total = expenseByCategory.reduce(
    (sum, item) => sum + Number(item._sum.netPaid || 0),
    0
  );

  const categoryLabels: Record<string, string> = {
    MATERIAL: "วัตถุดิบ",
    UTILITY: "สาธารณูปโภค",
    MARKETING: "การตลาด",
    SALARY: "เงินเดือน",
    FREELANCE: "ฟรีแลนซ์",
    TRANSPORT: "ขนส่ง",
    RENT: "ค่าเช่า",
    OFFICE: "สำนักงาน",
    OTHER: "อื่นๆ",
  };

  const chartData = expenseByCategory
    .filter((item) => item.category)
    .map((item) => {
      const value = Number(item._sum.netPaid) || 0;
      return {
        name: categoryLabels[item.category!] || item.category!,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);

  return <ExpenseCategoryChart data={chartData} />;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function RecentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
