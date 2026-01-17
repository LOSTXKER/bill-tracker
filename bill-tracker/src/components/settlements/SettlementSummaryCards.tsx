"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, Users, TrendingUp } from "lucide-react";

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32" />
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Pending Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">รอโอนคืนพนักงาน</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            ฿{pendingAmount.toLocaleString("th-TH")}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {pendingCount} รายการ
          </p>
        </CardContent>
      </Card>

      {/* People with Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">พนักงานที่รอรับเงิน</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {topUsersCount} คน
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            รอการโอนคืน
          </p>
        </CardContent>
      </Card>

      {/* Settled This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">โอนคืนเดือนนี้</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ฿{settledAmount.toLocaleString("th-TH")}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {settledCount} รายการ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
