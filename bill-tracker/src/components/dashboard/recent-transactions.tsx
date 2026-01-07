import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";

export async function RecentTransactions({ companyCode }: { companyCode: string }) {
  const company = await prisma.company.findUnique({
    where: { code: companyCode.toUpperCase() },
  });

  if (!company) return null;

  const [recentExpenses, recentIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.income.findMany({
      where: { companyId: company.id, deletedAt: null },
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
            {combined.map((item) => (
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
                        ? (item as (typeof recentExpenses)[0]).description ||
                          "ไม่ระบุ"
                        : (item as (typeof recentIncomes)[0]).source ||
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

export function RecentSkeleton() {
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
