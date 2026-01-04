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
  Plus,
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมรายรับ-รายจ่ายและเอกสารที่ต้องจัดการ
          </p>
        </div>
        <Link href={`/${companyCode.toLowerCase()}/capture`}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            บันทึกรายการ
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

  const stats = [
    {
      title: "รายรับเดือนนี้",
      value: formatCurrency(totalIncome),
      icon: ArrowDownCircle,
      iconColor: "text-primary",
      trend: "positive" as const,
    },
    {
      title: "รายจ่ายเดือนนี้",
      value: formatCurrency(totalExpense),
      icon: ArrowUpCircle,
      iconColor: "text-destructive",
      trend: "negative" as const,
    },
    {
      title: "กระแสเงินสดสุทธิ",
      value: formatCurrency(netCashFlow),
      icon: TrendingUp,
      iconColor: netCashFlow >= 0 ? "text-primary" : "text-destructive",
      trend: netCashFlow >= 0 ? "positive" as const : "negative" as const,
    },
    {
      title: "เอกสารค้าง",
      value: `${pendingDocs} รายการ`,
      icon: Clock,
      iconColor: "text-amber-500",
      trend: "neutral" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
      {stats.map((stat, i) => (
        <Card key={i} className="border-border/50 shadow-card hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold tracking-tight ${
              stat.trend === "positive" ? "text-foreground" :
              stat.trend === "negative" ? "text-foreground" :
              "text-foreground"
            }`}>
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
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
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          ด่วน! ต้องจัดการ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            ไม่มีรายการที่ต้องจัดการ
          </p>
        ) : (
          <div className="space-y-4">
            {waitingDocs.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอใบเสร็จจากร้านค้า ({waitingDocs.length})
                </p>
                <div className="space-y-2">
                  {waitingDocs.map((expense: typeof waitingDocs[number]) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {expense.vendorName || expense.description || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(expense.netPaid))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                        รอบิล
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingWht.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอใบ 50 ทวิ จากลูกค้า ({waitingWht.length})
                </p>
                <div className="space-y-2">
                  {waitingWht.map((income: typeof waitingWht[number]) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {income.customerName || income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
                        รอใบ 50 ทวิ
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {waitingIssue.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  รอออกบิลให้ลูกค้า ({waitingIssue.length})
                </p>
                <div className="space-y-2">
                  {waitingIssue.map((income: typeof waitingIssue[number]) => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-xl bg-muted/50 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {income.customerName || income.source || "ไม่ระบุ"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(income.netReceived))}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50">
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
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <FileCheck className="h-4 w-4 text-amber-500" />
          </div>
          รอส่งบัญชี
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            ไม่มีเอกสารรอส่ง
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                ใบเสร็จรายจ่าย
              </span>
              <Badge variant="secondary" className="font-medium">
                {pendingExpenses} รายการ
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">
                สำเนาบิลขาย
              </span>
              <Badge variant="secondary" className="font-medium">
                {pendingIncomes} รายการ
              </Badge>
            </div>
            <Button variant="outline" className="w-full mt-2">
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
    ...recentExpenses.map((e: typeof recentExpenses[number]) => ({ ...e, type: "expense" as const })),
    ...recentIncomes.map((i: typeof recentIncomes[number]) => ({ ...i, type: "income" as const })),
  ]
    .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">รายการล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            ยังไม่มีรายการ
          </p>
        ) : (
          <div className="space-y-2">
            {combined.map((item: typeof combined[number]) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      item.type === "income"
                        ? "bg-primary/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {item.type === "income" ? (
                      <ArrowDownCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.type === "expense"
                        ? (item as (typeof recentExpenses)[0]).vendorName ||
                          (item as (typeof recentExpenses)[0]).description ||
                          "ไม่ระบุ"
                        : (item as (typeof recentIncomes)[0]).customerName ||
                          (item as (typeof recentIncomes)[0]).source ||
                          "ไม่ระบุ"}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                      ? "text-primary"
                      : "text-destructive"
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
        <Card key={i} className="border-border/50">
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
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
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

  let total = 0;
  for (const item of expenseByCategory) {
    total += Number(item._sum.netPaid || 0);
  }

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
    .filter((item: typeof expenseByCategory[number]) => item.category)
    .map((item: typeof expenseByCategory[number]) => {
      const value = Number(item._sum.netPaid) || 0;
      return {
        name: categoryLabels[item.category!] || item.category!,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      };
    })
    .sort((a: any, b: any) => b.value - a.value);

  return <ExpenseCategoryChart data={chartData} />;
}

function ChartSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}

function RecentSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}
