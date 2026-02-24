import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { prisma } from "@/lib/db";
import { getCompanyId } from "@/lib/cache/company";

interface CrossCompanySummaryProps {
  companyCode: string;
}

export async function CrossCompanySummary({ companyCode }: CrossCompanySummaryProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [paidForOthers, paidByOthers] = await Promise.all([
    // Expenses we paid for other companies (our companyId, different internalCompanyId)
    prisma.expense.aggregate({
      where: {
        companyId: companyId,
        internalCompanyId: { not: companyId },
        billDate: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
    // Expenses other companies paid for us (different companyId, our internalCompanyId)
    prisma.expense.aggregate({
      where: {
        companyId: { not: companyId },
        internalCompanyId: companyId,
        billDate: { gte: startOfMonth, lte: endOfMonth },
        deletedAt: null,
      },
      _sum: { netPaid: true },
      _count: true,
    }),
  ]);

  const paidForOthersAmount = Number(paidForOthers._sum.netPaid) || 0;
  const paidByOthersAmount = Number(paidByOthers._sum.netPaid) || 0;
  const netSettlement = paidForOthersAmount - paidByOthersAmount;

  // If no cross-company transactions, don't show the card
  if (paidForOthers._count === 0 && paidByOthers._count === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base font-medium">การจ่ายข้ามบริษัท</CardTitle>
            <CardDescription className="text-xs">เดือนนี้</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Paid for others */}
          <div className="rounded-lg bg-background/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
              <span>เราจ่ายแทนบริษัทอื่น</span>
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(paidForOthersAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {paidForOthers._count} รายการ
            </p>
          </div>

          {/* Paid by others */}
          <div className="rounded-lg bg-background/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
              <span>บริษัทอื่นจ่ายแทนเรา</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(paidByOthersAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {paidByOthers._count} รายการ
            </p>
          </div>
        </div>

        {/* Net Settlement */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-background p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">
                {netSettlement >= 0 ? "ต้องเรียกเก็บจากบริษัทอื่น" : "ต้องจ่ายคืนบริษัทอื่น"}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={netSettlement >= 0 
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400" 
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
              }
            >
              {formatCurrency(Math.abs(netSettlement))}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CrossCompanySummarySkeleton() {
  return (
    <Card className="border-amber-200/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <Skeleton className="h-12 rounded-lg" />
      </CardContent>
    </Card>
  );
}
