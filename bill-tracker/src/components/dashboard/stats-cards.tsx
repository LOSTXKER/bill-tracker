import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { formatCurrency } from "@/lib/utils/tax-calculator";
import { getCompanyId } from "@/lib/cache/company";
import { getExpenseStats, getIncomeStats, ViewMode } from "@/lib/cache/stats";

interface StatsCardsProps {
  companyCode: string;
  viewMode?: ViewMode;
}

export async function StatsCards({ companyCode, viewMode = "official" }: StatsCardsProps) {
  const companyId = await getCompanyId(companyCode);
  if (!companyId) return null;

  // Use cached stats for better performance
  // Pass viewMode to expense stats (income doesn't have internal company concept yet)
  const [expenseStats, incomeStats] = await Promise.all([
    getExpenseStats(companyId, viewMode),
    getIncomeStats(companyId),
  ]);

  const totalIncome = incomeStats.monthlyTotal;
  const totalExpense = expenseStats.monthlyTotal;
  const netCashFlow = totalIncome - totalExpense;
  const pendingDocs = expenseStats.waitingTaxInvoice + expenseStats.readyForAccounting;

  // Format stats for StatsGrid component
  const stats = [
    {
      title: "รายรับเดือนนี้",
      value: formatCurrency(totalIncome),
      subtitle: "เดือนนี้",
      icon: "arrow-down-circle",
      iconColor: "text-primary",
    },
    {
      title: "รายจ่ายเดือนนี้",
      value: formatCurrency(totalExpense),
      subtitle: "เดือนนี้",
      icon: "arrow-up-circle",
      iconColor: "text-destructive",
    },
    {
      title: "กระแสเงินสดสุทธิ",
      value: formatCurrency(netCashFlow),
      subtitle: netCashFlow >= 0 ? "กำไร" : "ขาดทุน",
      icon: "trending-up",
      iconColor: netCashFlow >= 0 ? "text-primary" : "text-destructive",
    },
    {
      title: "เอกสารค้าง",
      value: `${pendingDocs} รายการ`,
      subtitle: "รอดำเนินการ",
      icon: "clock",
      iconColor: "text-amber-500",
    },
  ];

  return <StatsGrid stats={stats} />;
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
