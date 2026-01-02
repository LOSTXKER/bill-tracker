import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Wallet, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/validations/expense";

interface BudgetsPageProps {
  params: Promise<{ company: string }>;
}

export default async function BudgetsPage({ params }: BudgetsPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            งบประมาณ
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            กำหนดและติดตามงบประมาณรายจ่ายตามหมวดหมู่
          </p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
          <Plus className="mr-2 h-4 w-4" />
          ตั้งงบประมาณ
        </Button>
      </div>

      {/* Budget Overview */}
      <Suspense fallback={<BudgetSkeleton />}>
        <BudgetOverview companyCode={companyCode} />
      </Suspense>
    </div>
  );
}

async function BudgetOverview({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get current month budgets
  const budgets = await prisma.budget.findMany({
    where: {
      companyId: company.id,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
  });

  // Get actual spending by category
  const spending = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      companyId: company.id,
      billDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { netPaid: true },
  });

  const spendingMap = new Map(
    spending.map((s) => [s.category, Number(s._sum.netPaid) || 0])
  );

  // Calculate total budget and spending
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpending = Array.from(spendingMap.values()).reduce((sum, v) => sum + v, 0);
  const totalPercentage = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

  if (budgets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Wallet className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          ยังไม่ได้ตั้งงบประมาณ
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          ตั้งงบประมาณเพื่อควบคุมรายจ่ายในแต่ละหมวดหมู่
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          ตั้งงบประมาณแรก
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            สรุปงบประมาณเดือนนี้
          </CardTitle>
          <CardDescription>
            {now.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500 mb-1">งบประมาณรวม</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">ใช้ไปแล้ว</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalSpending)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">คงเหลือ</p>
              <p
                className={`text-2xl font-bold ${
                  totalBudget - totalSpending >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(totalBudget - totalSpending)}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">ความคืบหน้า</span>
              <span
                className={`font-medium ${
                  totalPercentage > 100
                    ? "text-red-600"
                    : totalPercentage > 80
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(totalPercentage, 100)}
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget by Category */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          const spent = spendingMap.get(budget.category) || 0;
          const percentage = Number(budget.amount) > 0
            ? (spent / Number(budget.amount)) * 100
            : 0;
          const isOverBudget = percentage > 100;
          const isWarning = percentage > 80 && percentage <= 100;

          return (
            <Card
              key={budget.id}
              className={`${
                isOverBudget
                  ? "border-red-200 dark:border-red-800"
                  : isWarning
                  ? "border-amber-200 dark:border-amber-800"
                  : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {EXPENSE_CATEGORY_LABELS[budget.category] || budget.category}
                  </CardTitle>
                  {isOverBudget ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      เกินงบ
                    </Badge>
                  ) : isWarning ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      ใกล้หมด
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      ปกติ
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      ใช้ไป: {formatCurrency(spent)}
                    </span>
                    <span className="text-slate-500">
                      งบ: {formatCurrency(Number(budget.amount))}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percentage, 100)}
                    className={`h-2 ${
                      isOverBudget
                        ? "[&>div]:bg-red-500"
                        : isWarning
                        ? "[&>div]:bg-amber-500"
                        : "[&>div]:bg-emerald-500"
                    }`}
                  />
                  <div className="flex justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isOverBudget
                          ? "text-red-600"
                          : isWarning
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm text-slate-500">
                      คงเหลือ:{" "}
                      {formatCurrency(Math.max(0, Number(budget.amount) - spent))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
