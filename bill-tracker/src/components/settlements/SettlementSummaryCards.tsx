"use client";

import { StatsGrid } from "@/components/shared/StatsGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/tax-calculator";

interface SummaryData {
  pending: {
    total: {
      count: number;
      amount: number;
    };
    topUsers?: Array<{
      userId: string | null;
      name: string;
      count: number;
      amount: number;
    }>;
  };
  settledThisMonth: {
    count: number;
    amount: number;
  };
}

interface SettlementSummaryCardsProps {
  data: SummaryData | null;
  isLoading: boolean;
}

export function SettlementSummaryCards({ data, isLoading }: SettlementSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-border/50 shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const pendingCount = data?.pending.total.count || 0;
  const pendingAmount = data?.pending.total.amount || 0;
  const settledCount = data?.settledThisMonth.count || 0;
  const settledAmount = data?.settledThisMonth.amount || 0;
  const topUsersCount = data?.pending.topUsers?.length || 0;

  const stats = [
    {
      title: "รอโอนคืนพนักงาน",
      value: formatCurrency(pendingAmount),
      subtitle: `${pendingCount} รายการ`,
      icon: "clock",
      iconColor: "text-amber-500",
      featured: true,
    },
    {
      title: "พนักงานที่รอรับเงิน",
      value: `${topUsersCount} คน`,
      subtitle: "รอการโอนคืน",
      icon: "wallet",
      iconColor: "text-primary",
    },
    {
      title: "โอนคืนเดือนนี้",
      value: formatCurrency(settledAmount),
      subtitle: `${settledCount} รายการ`,
      icon: "check-circle",
      iconColor: "text-primary",
    },
  ];

  return <StatsGrid stats={stats} />;
}
