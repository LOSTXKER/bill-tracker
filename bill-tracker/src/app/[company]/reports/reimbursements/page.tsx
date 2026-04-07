"use client";

import { use, useState } from "react";
import { APP_LOCALE, APP_TIMEZONE } from "@/lib/queries/date-utils";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  RefreshCw,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PersonBreakdownTable } from "@/components/settlements/PersonBreakdownTable";
import { fetcher } from "@/lib/utils/fetcher";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/tax-calculator";

function BarChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card p-3 rounded-lg border border-border shadow-lg">
      <p className="font-medium text-card-foreground mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-card-foreground">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

const thisYear = new Date().getFullYear();

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

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const isCurrentOrFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const handlePrevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString(APP_LOCALE, { month: "long", timeZone: APP_TIMEZONE });

  const buildApiUrl = () => {
    const m = month.toString().padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    return `/api/${companyCode}/settlements/report?dateFrom=${year}-${m}-01&dateTo=${year}-${m}-${lastDay}`;
  };

  const { data, error, isLoading, mutate } = useSWR<{ data: ReportData }>(
    buildApiUrl(),
    fetcher,
    { revalidateOnFocus: false }
  );

  const reportData = data?.data;
  const summary = reportData?.summary;

  const chartData = reportData?.byMonth
    .slice()
    .reverse()
    .slice(-12)
    .map((item) => ({
      month: formatMonthLabel(item.month),
      จ่ายแล้ว: item.settled,
      ค้างจ่าย: item.pending,
    })) || [];

  // Loading skeleton
  if (isLoading && !reportData) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="รายงานเบิกจ่าย"
        description="สรุปยอดเบิกจ่ายรายบุคคลและรายเดือน"
        icon={Receipt}
      />

      {/* Navigation + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handlePrevMonth}
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center select-none">
            {monthLabel} {year + 543}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleNextMonth}
            disabled={isCurrentOrFuture}
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Select value={year.toString()} onValueChange={(y) => setYear(parseInt(y))}>
          <SelectTrigger className="h-8 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => (
              <SelectItem key={i} value={(thisYear - i).toString()}>
                {thisYear - i + 543}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => mutate()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
        <Link href={`/api/${companyCode}/settlements/report/export?year=${year}&month=${month}`}>
          <Button size="sm" className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่</span>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              ลองใหม่
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            จ่ายแล้ว
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(summary?.totalSettled || 0)}
          </p>
          <p className="text-xs text-muted-foreground">{summary?.settledCount || 0} รายการ</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-500" />
            ค้างจ่าย
          </p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {formatCurrency(summary?.totalPending || 0)}
          </p>
          <p className="text-xs text-muted-foreground">{summary?.pendingCount || 0} รายการ</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-500" />
            รอรับเงิน
          </p>
          <p className="text-xl font-bold mt-0.5">
            {summary?.personsWithPending || 0} <span className="text-sm font-normal text-muted-foreground">คน</span>
          </p>
          <p className="text-xs text-muted-foreground">รอการโอนคืน</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-500" />
            ทั้งหมด
          </p>
          <p className="text-xl font-bold mt-0.5">
            {summary?.personCount || 0} <span className="text-sm font-normal text-muted-foreground">คน</span>
          </p>
          <p className="text-xs text-muted-foreground">มีประวัติการจ่าย</p>
        </div>
      </div>

      {/* Monthly Chart — full width */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            ยอดเบิกจ่ายรายเดือน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={formatCurrencyCompact}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<BarChartTooltip />} cursor={{ fill: "var(--muted-foreground)", opacity: 0.08 }} />
                <Legend />
                <Bar
                  dataKey="จ่ายแล้ว"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ค้างจ่าย"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              ไม่มีข้อมูลในช่วงเวลาที่เลือก
            </div>
          )}
        </CardContent>
      </Card>

      {/* Person Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            รายละเอียดตามพนักงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonBreakdownTable
            data={reportData?.byPerson || []}
            isLoading={isLoading}
            companyCode={companyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
