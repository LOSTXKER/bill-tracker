import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  StatsCards,
  StatsSkeleton,
  ActionRequired,
  ActionSkeleton,
  ReadyToSend,
  RecentTransactions,
  RecentSkeleton,
  CashFlowChartData,
  MonthlyTrendChartData,
  ExpenseCategoryChartData,
  ChartSkeleton,
} from "@/components/dashboard";

interface DashboardPageProps {
  params: Promise<{ company: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { company: companyCode } = await params;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            ภาพรวมรายรับ-รายจ่ายและเอกสารที่ต้องจัดการ
          </p>
        </div>
        <Link href={`/${companyCode.toLowerCase()}/capture`}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            บันทึกรายการ
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards companyCode={companyCode} />
      </Suspense>

      {/* Action Required Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ActionSkeleton />}>
          <ActionRequired companyCode={companyCode} />
        </Suspense>

        <Suspense fallback={<ActionSkeleton />}>
          <ReadyToSend companyCode={companyCode} />
        </Suspense>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <MonthlyTrendChartData companyCode={companyCode} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <ExpenseCategoryChartData companyCode={companyCode} />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <CashFlowChartData companyCode={companyCode} />
      </Suspense>

      {/* Recent Transactions */}
      <Suspense fallback={<RecentSkeleton />}>
        <RecentTransactions companyCode={companyCode} />
      </Suspense>
    </div>
  );
}
