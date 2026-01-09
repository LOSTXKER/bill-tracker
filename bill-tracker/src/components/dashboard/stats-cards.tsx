import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

export async function StatsCards({ companyCode }: { companyCode: string }) {
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
        deletedAt: null,
      },
      _sum: { netReceived: true },
    }),
    prisma.expense.aggregate({
      where: {
        companyId: company.id,
        billDate: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { netPaid: true },
    }),
    prisma.expense.count({
      where: {
        companyId: company.id,
        status: { in: ["WAITING_FOR_DOC", "PENDING_PHYSICAL"] },
        deletedAt: null,
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
              stat.trend === "positive" ? "text-primary" :
              stat.trend === "negative" ? "text-destructive" :
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

export function StatsSkeleton() {
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
