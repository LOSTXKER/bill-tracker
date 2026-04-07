"use client";

import useSWR from "swr";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote } from "lucide-react";
import { fetcher } from "@/lib/utils/fetcher";
import { formatCurrency } from "@/lib/utils/tax-calculator";

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

interface SettlementAlertProps {
  companyCode: string;
}

export function SettlementAlert({ companyCode }: SettlementAlertProps) {
  const { data, isLoading, error } = useSWR<{ data: SettlementSummary }>(
    `/api/${companyCode}/settlements/summary`,
    fetcher,
    { revalidateOnFocus: false }
  );

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

  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-2.5">
      <Banknote className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
      <p className="flex-1 text-sm text-foreground">
        <span className="font-medium">รอโอนคืน:</span>{" "}
        {formatCurrency(pendingAmount)} ({topUsers.length} คน, {pendingCount} รายการ)
      </p>
      <Link
        href={`/${companyCode}/reimbursements`}
        className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline shrink-0"
      >
        จัดการ
      </Link>
    </div>
  );
}

export function SettlementAlertSkeleton() {
  return (
    <Skeleton className="h-10 w-full rounded-lg" />
  );
}
