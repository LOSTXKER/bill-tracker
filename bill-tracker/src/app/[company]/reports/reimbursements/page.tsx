"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download,
  RefreshCw,
  Calendar,
  FileBarChart,
} from "lucide-react";
import { ReportSummaryCards } from "@/components/settlements/ReportSummaryCards";
import { PersonBreakdownTable } from "@/components/settlements/PersonBreakdownTable";

interface ReimbursementReportPageProps {
  params: Promise<{ company: string }>;
}

interface ReportData {
  summary: {
    totalSettled: number;
    settledCount: number;
    totalPending: number;
    pendingCount: number;
    personCount: number;
    personsWithPending: number;
  };
  byPerson: Array<{
    id: string;
    userId: string;
    name: string;
    email: string | null;
    totalSettled: number;
    settledCount: number;
    totalPending: number;
    pendingCount: number;
  }>;
  byMonth: Array<{
    month: string;
    settled: number;
    settledCount: number;
    pending: number;
    pendingCount: number;
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Get current year and past 3 years
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

// Thai month names
const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = parseInt(month) - 1;
  return `${thaiMonths[monthIndex]} ${parseInt(year) + 543 - 2500}`;
}

export default function ReimbursementReportPage({ params }: ReimbursementReportPageProps) {
  const { company: companyCode } = use(params);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  // Build API URL with filters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    
    // Year filter
    if (selectedYear && selectedYear !== "all") {
      params.set("dateFrom", `${selectedYear}-01-01`);
      params.set("dateTo", `${selectedYear}-12-31`);
    }
    
    return `/api/${companyCode}/settlements/report?${params.toString()}`;
  };

  const { data, error, isLoading, mutate } = useSWR<{ data: ReportData }>(
    buildApiUrl(),
    fetcher,
    { revalidateOnFocus: false }
  );

  const reportData = data?.data;

  // Prepare chart data (reverse to show oldest first)
  const chartData = reportData?.byMonth
    .slice()
    .reverse()
    .slice(-12) // Last 12 months
    .map((item) => ({
      month: formatMonthLabel(item.month),
      จ่ายแล้ว: item.settled,
      รอจ่าย: item.pending,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileBarChart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">รายงานเบิกจ่าย</h1>
          <p className="text-muted-foreground text-sm">
            สรุปยอดเบิกจ่ายรายบุคคลและรายเดือน
          </p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="เลือกปี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year + 543}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedYear !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedYear("all")}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Link href={`/api/${companyCode}/settlements/report/export?year=${selectedYear}`}>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
          <Button variant="link" onClick={() => mutate()}>
            ลองอีกครั้ง
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div>
        <ReportSummaryCards 
          data={reportData?.summary || null} 
          isLoading={isLoading} 
        />
      </div>

      {/* Charts and Table Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              ยอดเบิกจ่ายรายเดือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#374151"
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(value) => 
                      value >= 1000 
                        ? `฿${(value / 1000).toFixed(0)}k` 
                        : `฿${value}`
                    }
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [
                      `฿${(value as number || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`,
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="จ่ายแล้ว" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="รอจ่าย" 
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูลในช่วงเวลาที่เลือก
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              สรุปภาพรวม
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">
                    ยอดจ่ายแล้ว
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ฿{(reportData?.summary?.totalSettled || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {reportData?.summary?.settledCount || 0} รายการ
                  </div>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium">
                    ยอดรอจ่าย
                  </div>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    ฿{(reportData?.summary?.totalPending || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {reportData?.summary?.pendingCount || 0} รายการ
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">
                    พนักงานที่รอรับเงิน
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {reportData?.summary?.personsWithPending || 0} คน
                  </div>
                  <div className="text-xs text-muted-foreground">
                    จากทั้งหมด {reportData?.summary?.personCount || 0} คน
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Person Breakdown Table */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            รายละเอียดตามพนักงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonBreakdownTable 
            data={reportData?.byPerson || []} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
