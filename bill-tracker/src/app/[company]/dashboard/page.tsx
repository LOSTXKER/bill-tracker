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
  SettlementAlert,
  SettlementAlertSkeleton,
  ViewModeToggle,
  CrossCompanySummary,
  CrossCompanySummarySkeleton,
} from "@/components/dashboard";

interface DashboardPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { company: companyCode } = await params;
  const urlParams = await searchParams;
  const viewMode = (urlParams.viewMode as string) || "official";

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3">
          <ViewModeToggle 
            companyCode={companyCode} 
            currentMode={viewMode as "official" | "internal"} 
          />
          <Link href={`/${companyCode.toLowerCase()}/capture`}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              บันทึกรายการ
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards companyCode={companyCode} viewMode={viewMode as "official" | "internal"} />
      </Suspense>

      {/* Cross-Company Summary - shows inter-company transactions */}
      <Suspense fallback={<CrossCompanySummarySkeleton />}>
        <CrossCompanySummary companyCode={companyCode} />
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

      {/* Settlement Alert - shows pending reimbursements for managers */}
      <Suspense fallback={<SettlementAlertSkeleton />}>
        <SettlementAlert companyCode={companyCode} />
      </Suspense>

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
