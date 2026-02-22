import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportDateSelector } from "@/components/reports/ReportDateSelector";
import { ReportDashboard } from "@/components/reports/ReportDashboard";
import { VATReport } from "@/components/reports/VATReport";
import { WHTReport } from "@/components/reports/WHTReport";
import { MonthlySummary } from "@/components/reports/MonthlySummary";
import { ReportSkeleton } from "@/components/reports/ReportSkeleton";
import { ViewModeToggle } from "@/components/dashboard";
import { LayoutDashboard, FileSpreadsheet, Calculator, FileText } from "lucide-react";

interface ReportsPageProps {
  params: Promise<{ company: string }>;
  searchParams: Promise<{ month?: string; year?: string; viewMode?: string; tab?: string }>;
}

type ViewMode = "official" | "internal";

export default async function ReportsPage({ params, searchParams }: ReportsPageProps) {
  const { company: companyCode } = await params;
  const { month, year, viewMode: viewModeParam, tab } = await searchParams;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const selectedYear = year ? parseInt(year) : currentYear;
  const selectedMonth = month ? parseInt(month) : currentMonth;
  const viewMode: ViewMode = (viewModeParam as ViewMode) || "official";
  const defaultTab = tab || "overview";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">รายงาน</h1>
          <p className="text-muted-foreground">รายงานภาษีและสรุปรายรับ-รายจ่าย</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ViewModeToggle companyCode={companyCode} currentMode={viewMode} />
          <ReportDateSelector
            companyCode={companyCode}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
          />
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">ภาพรวม</span>
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">สรุปรายเดือน</span>
          </TabsTrigger>
          <TabsTrigger value="vat" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">VAT</span>
          </TabsTrigger>
          <TabsTrigger value="wht" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">หัก ณ ที่จ่าย</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Suspense fallback={<ReportSkeleton />}>
            <ReportDashboard
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="summary">
          <Suspense fallback={<ReportSkeleton />}>
            <MonthlySummary
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="vat">
          <Suspense fallback={<ReportSkeleton />}>
            <VATReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="wht">
          <Suspense fallback={<ReportSkeleton />}>
            <WHTReport
              companyCode={companyCode}
              year={selectedYear}
              month={selectedMonth}
              viewMode={viewMode}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
