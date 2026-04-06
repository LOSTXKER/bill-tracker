import { Suspense } from "react";
import { TabsContent } from "@/components/ui/tabs";
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
    <div className="flex flex-col min-h-0">
      {/* Page title */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">รายงาน</h1>
      </div>

      {/* Sticky controls bar */}
      <ReportControlsBar
        companyCode={companyCode}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        currentMode={viewMode}
      />

      {/* Always-visible KPI ribbon */}
      <Suspense fallback={<div className="h-[88px] animate-pulse bg-muted/40 border-b" />}>
        <ReportKpiRibbon
          companyCode={companyCode}
          year={selectedYear}
          month={selectedMonth}
          viewMode={viewMode}
        />
      </Suspense>

      {/* Tab navigation + content */}
      <div className="px-4 pt-4 pb-8 space-y-0">
        <ReportTabs currentTab={currentTab}>
          {/* Overview = charts + full detail tables */}
          <TabsContent value="overview" className="space-y-6 mt-0">
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

          {/* VAT */}
          <TabsContent value="vat" className="mt-0">
            <Suspense fallback={<ReportSkeleton />}>
              <VATReport
                companyCode={companyCode}
                year={selectedYear}
                month={selectedMonth}
                viewMode={viewMode}
              />
            </Suspense>
          </TabsContent>

          {/* WHT */}
          <TabsContent value="wht" className="mt-0">
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
    </div>
  );
}
