import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { formatThaiDate } from "@/lib/utils/formatters";
import { getCompanyId } from "@/lib/cache/company";
import { reimbursementFilter, buildIncomeBaseWhere } from "@/lib/queries/expense-filters";
import Link from "next/link";

export async function RecentTransactions({ companyCode }: { companyCode: string }) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const [recentExpenses, recentIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { ...reimbursementFilter, companyId: companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { ...buildIncomeBaseWhere(companyId) },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const combined = [
    ...recentExpenses.map((e) => ({ ...e, type: "expense" as const })),
    ...recentIncomes.map((i) => ({ ...i, type: "income" as const })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          รายการล่าสุด
          <Link
            href={`/${companyCode}/expenses`}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ดูทั้งหมด
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {combined.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            ยังไม่มีรายการ
          </p>
        ) : (
          <div className="space-y-1.5">
            {combined.map((item) => {
              const isIncome = item.type === "income";
              const href = `/${companyCode}/${item.type}s/${item.id}`;
              const description = isIncome
                ? (item as (typeof recentIncomes)[0]).source || "ไม่ระบุ"
                : (item as (typeof recentExpenses)[0]).description || "ไม่ระบุ";
              const amount = Number(
                isIncome
                  ? (item as (typeof recentIncomes)[0]).netReceived
                  : (item as (typeof recentExpenses)[0]).netPaid
              );

              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`rounded-full p-1.5 shrink-0 ${
                        isIncome ? "bg-primary/10" : "bg-destructive/10"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownCircle className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpCircle className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatThaiDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ml-3 ${
                      isIncome ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(amount)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}
