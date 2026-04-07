import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportControlsBar } from "@/components/reports/ReportControlsBar";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { ReportKpiRibbon } from "@/components/reports/ReportKpiRibbon";
import { ReportDashboard } from "@/components/reports/ReportDashboard";
import { VATReport } from "@/components/reports/VATReport";
import { WHTReport } from "@/components/reports/WHTReport";
import { MonthlySummary } from "@/components/reports/MonthlySummary";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";

interface ReportsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string; year?: string; viewMode?: string; tab?: string }>;
}

type ViewMode = "official" | "internal";

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { company: companyCode } = await params;
  const { month, year, viewMode: viewModeParam, tab } = await searchParams;

  const now = new Date();
  const selectedYear = year ? parseInt(year) : now.getFullYear();
  const selectedMonth = month ? parseInt(month) : now.getMonth() + 1;
  const viewMode: ViewMode = (viewModeParam as ViewMode) || "internal";
  const currentTab = tab || "overview";

  return (
    <div className="space-y-5">
      <PageHeader
        title="รายงาน"
        description="ภาษีและสรุปรายรับ-รายจ่าย"
        icon={BarChart3}
      />

      {/* Sticky controls bar */}
      <ReportControlsBar
        companyCode={companyCode}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        currentMode={viewMode}
      />

      {/* Always-visible KPI ribbon */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}</div>}>
        <ReportKpiRibbon
          companyCode={companyCode}
          year={selectedYear}
          month={selectedMonth}
          viewMode={viewMode}
        />
      </Suspense>

      {/* Tab navigation + content */}
      <ReportTabs currentTab={currentTab}>
        <TabsContent value="overview" className="space-y-6 mt-4">
          <Suspense fallback={<ReportSkeleton />}>
            <ReportDashboard
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
          <Suspense fallback={<ReportSkeleton />}>
            <MonthlySummary
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="vat" className="mt-4">
          <Suspense fallback={<ReportSkeleton />}>
            <VATReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="wht" className="mt-4">
          <Suspense fallback={<ReportSkeleton />}>
            <WHTReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>
      </ReportTabs>
    </div>
  );
}
