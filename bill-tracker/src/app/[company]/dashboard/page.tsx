import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  StatsCards,
  StatsSkeleton,
  RecentTransactions,
  RecentSkeleton,
  MonthlyTrendChartData,
  ExpenseCategoryChartData,
  DataQualityStats,
  ChartSkeleton,
  SettlementAlert,
  ViewModeToggle,
  CrossCompanySummary,
} from "@/components/dashboard";
import { TasksSidebar, TasksSidebarSkeleton } from "@/components/dashboard/tasks-sidebar";

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
      <PageHeader
        title="ภาพรวม"
        description="ภาพรวมรายรับ-รายจ่ายและเอกสารที่ต้องจัดการ"
        icon={LayoutDashboard}
        actions={
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
        }
      />

      {/* KPI Strip */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards companyCode={companyCode} viewMode={viewMode as "official" | "internal"} />
      </Suspense>

      {/* Alert Banners */}
      <div className="space-y-2">
        <Suspense fallback={null}>
          <CrossCompanySummary companyCode={companyCode} />
        </Suspense>
        <Suspense fallback={null}>
          <SettlementAlert companyCode={companyCode} />
        </Suspense>
      </div>

      {/* Main 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: chart + recent */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<ChartSkeleton />}>
            <MonthlyTrendChartData companyCode={companyCode} />
          </Suspense>
          <Suspense fallback={<RecentSkeleton />}>
            <RecentTransactions companyCode={companyCode} />
          </Suspense>
        </div>
        {/* Right: tasks + quality + category */}
        <div className="space-y-6">
          <Suspense fallback={<TasksSidebarSkeleton />}>
            <TasksSidebar companyCode={companyCode} />
          </Suspense>
          <Suspense fallback={null}>
            <DataQualityStats companyCode={companyCode} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <ExpenseCategoryChartData companyCode={companyCode} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
