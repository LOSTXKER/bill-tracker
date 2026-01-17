"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, ArrowRight, Users, AlertCircle } from "lucide-react";

interface SettlementSummary {
  pending: {
    total: {
      count: number;
      amount: number;
    };
    byType: Record<string, { count: number; amount: number }>;
    topUsers: Array<{
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SettlementAlertProps {
  companyCode: string;
}

export function SettlementAlert({ companyCode }: SettlementAlertProps) {
  const { data: session } = useSession();
  
  const { data, isLoading, error } = useSWR<{ data: SettlementSummary }>(
    `/api/${companyCode}/settlements/summary`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Don't show anything if loading or error or no pending settlements
  if (isLoading) {
    return <SettlementAlertSkeleton />;
  }

  if (error || !data?.data) {
    return null;
  }

  const summary = data.data;
  const pendingCount = summary.pending.total.count;
  const pendingAmount = summary.pending.total.amount;
  const topUsers = summary.pending.topUsers || [];

  // Don't show if no pending settlements
  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Banknote className="h-4 w-4" />
            </div>
            รอโอนคืนเงิน
          </div>
          <Link href={`/${companyCode}/reimbursements`}>
            <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-white/60 dark:bg-background/40 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
              ยอดค้างจ่าย
            </div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              ฿{pendingAmount.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-muted-foreground">
              {pendingCount} รายการ
            </div>
          </div>
          <div className="p-3 bg-white/60 dark:bg-background/40 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              รอรับเงิน
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {topUsers.length} คน
            </div>
            <div className="text-xs text-muted-foreground">
              รอการโอนคืน
            </div>
          </div>
        </div>

        {/* Top Users waiting */}
        {topUsers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              รอรับเงินมากที่สุด:
            </div>
            <div className="space-y-1.5">
              {topUsers.slice(0, 3).map((user, idx) => (
                <div 
                  key={user.userId || user.name} 
                  className="flex items-center justify-between text-sm p-2 bg-white/40 dark:bg-background/20 rounded"
                >
                  <span className="font-medium">{user.name}</span>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">
                    ฿{user.amount.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettlementAlertSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
